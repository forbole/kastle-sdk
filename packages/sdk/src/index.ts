import { getKaspaProvider } from "./kastle/provider";
import {
  createTransactions,
  ScriptBuilder,
  PublicKey,
  Opcodes,
  addressFromScriptPublicKey,
  kaspaToSompi,
  IUtxoEntry,
  SighashType,
  IPaymentOutput,
  createTransaction,
  Transaction,
  payToAddressScript,
} from "./wasm/kaspa";
import { rpcClient, watchBalanceChanged } from "./rpc-client";
import { IWalletEventHandler, NetworkId } from "./interfaces";
import { listeners, ListenerMethod } from "./listener";
import { sleep } from "./utils";

// ------------------------------------------------------------------------
// --------------------------Basic functions-------------------------------
// ------------------------------------------------------------------------

/**
 * Checks if the wallet provider is installed
 */
export const isWalletInstalled = (): boolean => {
  try {
    getKaspaProvider();
    return true;
  } catch (_) {
    return false;
  }
};

/**
 * Disconnects the wallet from the platform
 */
export const disconnect = async (): Promise<void> => {
  return getKaspaProvider().disconnect();
};

/**
 * Connect the wallet for the platform
 */
export const connect = async (): Promise<boolean> => {
  const connected = await getKaspaProvider().connect();
  watchBalanceChanged(await getWalletAddress());
  return connected;
};

/**
 * Returns the currently connected wallet address
 */
export const getWalletAddress = async (): Promise<string> => {
  let account: { address: string; publicKey: string } =
    await getKaspaProvider().request("kas:get_account");

  return account.address;
};

/**
 * Retrieves the public key associated with the wallet
 */
export const getPublicKey = async (): Promise<string> => {
  let account: { address: string; publicKey: string } =
    await getKaspaProvider().request("kas:get_account");

  return account.publicKey;
};

/**
 * Returns the active Kaspa network (mainnet, testnet)
 */
export const getNetwork = async (): Promise<NetworkId> => {
  return getKaspaProvider().request("kas:get_network");
};

/**
 * Requests a network switch to a different Kaspa chain
 * @param networkId The network to switch to
 */
export const switchNetwork = async (
  networkId: NetworkId,
): Promise<NetworkId> => {
  const target: NetworkId = await getKaspaProvider().request(
    "kas:switch_network",
    networkId,
  );

  return target;
};

/**
 * Fetches the current balance of the wallet
 */
export const getBalance = async (): Promise<number> => {
  const address = await getWalletAddress();
  const response = await rpcClient?.getBalanceByAddress({ address });

  return parseInt(response?.balance?.toString() ?? "0", 10);
};

/**
 * Sends Kaspa (KAS) to another address
 * @param toAddress Recipient address
 * @param amountSompi Amount to send in sompi
 * @param options Optional parameters including priorityFee
 */
export const sendKaspa = async (
  toAddress: string,
  amountSompi: number,
  options?: { priorityFee?: number },
): Promise<string> => {
  if (!rpcClient) throw new Error("Unable to reach RPC");

  let currentAddress = await getWalletAddress();
  let { entries } = await rpcClient.getUtxosByAddresses({
    addresses: [currentAddress],
  });

  let { transactions } = await createTransactions({
    changeAddress: currentAddress,
    entries,
    outputs: [
      {
        address: toAddress,
        amount: BigInt(amountSompi),
      },
    ],
    priorityFee: BigInt(options?.priorityFee ?? 0),
    networkId: await getNetwork(),
  });

  const [transaction] = transactions;

  return getKaspaProvider().request("kas:sign_and_broadcast_tx", {
    networkId: await getNetwork(),
    txJson: transaction.serializeToSafeJSON(),
  });
};

/**
 * Signs a message using the wallet's private key and returns the signature
 * @param msg Message to sign
 */
export const signMessage = async (msg: string): Promise<string> => {
  return await getKaspaProvider().request("kas:sign_message", msg);
};

/**
 * Retrieves unspent utxo by an address
 * @param address address
 */
export const getUtxosByAddress = async (address: string) => {
  if (!rpcClient) throw new Error("Unable to reach RPC");

  const { entries } = await rpcClient.getUtxosByAddresses({
    addresses: [address],
  });

  return entries;
};

/**
 * Creates a transaction with the given inputs and outputs, NOTE: please add the change output manually
 * @param entries UTXO entries to be used as inputs
 * @param outputs Payment outputs to be included in the transaction
 * @param priorityFee Optional priority fee for the transaction
 * @param payload Optional payload for the transaction
 * @return Serialized transaction JSON string
 */
export const buildTransaction = async (
  entries: IUtxoEntry[],
  outputs: IPaymentOutput[],
  payload?: string,
) => {
  const transaction = createTransaction(entries, outputs, BigInt(0), payload);
  const txJson = transaction.serializeToSafeJSON();
  return txJson;
};

/**
 * Sends a transaction with extra outputs
 * @param txJson Transaction JSON string
 * @param extraOutputs Extra outputs to be added to the transaction
 * @param priorityFee Priority fee for the transaction
 * @return Transaction ID of the sent transaction
 */
export const sendTransactionWithExtraOutputs = async (
  txJson: string,
  extraOutputs: { address: string; value: bigint }[],
  priorityFee: bigint,
) => {
  const senderUtxos = await getUtxosByAddress(await getWalletAddress());
  const transaction = Transaction.deserializeFromSafeJSON(txJson);

  let inputsBalance = transaction.inputs.reduce(
    (acc, input) => acc + (input.utxo?.amount ?? BigInt(0)),
    BigInt(0),
  );

  const outputsBalance = transaction.outputs.reduce(
    (acc, output) => acc + output.value,
    BigInt(0),
  );

  const extraOutputsBalance = extraOutputs.reduce(
    (acc, output) => acc + output.value,
    BigInt(0),
  );

  const totalOutputsBalance =
    outputsBalance + extraOutputsBalance + priorityFee;

  // Add inputs to the transaction until the balance is sufficient
  let changeAmount = inputsBalance - totalOutputsBalance;
  while (
    inputsBalance < totalOutputsBalance ||
    (changeAmount !== BigInt(0) && changeAmount <= kaspaToSompi("0.2")!)
  ) {
    const inputUtxo = senderUtxos.pop();
    if (!inputUtxo) {
      throw new Error("Not enough UTXOs to cover the transaction fee");
    }

    transaction.inputs.push({
      previousOutpoint: inputUtxo.outpoint,
      sequence: BigInt(0),
      sigOpCount: 1,
      utxo: inputUtxo,
    });

    inputsBalance += inputUtxo.amount;
    changeAmount = inputsBalance - totalOutputsBalance;
  }

  // Add change output to the transaction
  transaction.outputs.push({
    scriptPublicKey: payToAddressScript(await getWalletAddress()),
    value: changeAmount,
  });

  // Add extra outputs to the transaction
  transaction.outputs.push(
    ...extraOutputs.map((output) => ({
      scriptPublicKey: payToAddressScript(output.address),
      value: output.value,
    })),
  );

  const txId = await getKaspaProvider().request("kas:sign_and_broadcast_tx", {
    networkId: await getNetwork(),
    txJson: transaction.serializeToSafeJSON(),
  });

  return txId;
};

// ------------------------------------------------------------------------
// --------------------------Script functions------------------------------
// ------------------------------------------------------------------------

const SIGN_TYPE = {
  All: SighashType.All,
  None: SighashType.None,
  Single: SighashType.Single,
  AllAnyOneCanPay: SighashType.AllAnyOneCanPay,
  NoneAnyOneCanPay: SighashType.NoneAnyOneCanPay,
  SingleAnyOneCanPay: SighashType.SingleAnyOneCanPay,
} as const;

export type SignType = (typeof SIGN_TYPE)[keyof typeof SIGN_TYPE];

export type ScriptOption = {
  inputIndex: number;
  script: ScriptBuilder;
  signType?: SignType;
};

/**
 * Signs a PSKT transaction for KRC20/KRC721 sends
 * @param txJsonString Transaction JSON string
 * @param scriptOptions Array of script options for signing
 * @return Signed transaction JSON string
 */
export const signPskt = async (
  txJsonString: string,
  scriptOptions: ScriptOption[],
): Promise<string> => {
  const networkId = await getNetwork();
  const scripts = scriptOptions.map((scriptOption) => ({
    inputIndex: scriptOption.inputIndex,
    scriptHex: scriptOption.script.toString(),
    signType: scriptOption.signType ?? SIGN_TYPE.All,
  }));

  const signed = await getKaspaProvider().request("kas:sign_tx", {
    networkId,
    txJson: txJsonString,
    scripts,
  });

  return signed;
};

type CommitRevealOptions = {
  commitPriorityFee?: bigint;
  revealPriorityFee?: bigint;
};

/**
 * Commits and reveals a script, which can be used for minting/listing KRC assets
 * @param script script to be used for the commit-reveal operation
 * @param options Optional commit-reveal options
 * @return An object containing the commit and reveal transaction IDs, or an error if one occurred
 */
export const doCommitReveal = async (
  script: ScriptBuilder,
  options?: CommitRevealOptions,
): Promise<{
  commitTxId?: string;
  revealTxId?: string;
  error?: Error;
}> => {
  const result: {
    commitTxId?: string;
    revealTxId?: string;
    error?: Error;
  } = { commitTxId: undefined, revealTxId: undefined, error: undefined };

  try {
    const commitTxId = await commitScript(script, options?.commitPriorityFee);
    result.commitTxId = commitTxId;
  } catch (error) {
    result.error = error as Error;
    return result;
  }

  try {
    const revealTxId = await revealScript(
      result.commitTxId!,
      script,
      options?.revealPriorityFee,
    );
    return { ...result, revealTxId };
  } catch (error) {
    return { ...result, error: error as Error };
  }
};

/**
 * Performs the commit phase of a commit-reveal operation for script
 * @param script script to be committed
 * @param priorityFee Optional priority fee for the commit transaction
 * @return Transaction ID of the commit transaction
 */
export const commitScript = async (
  script: ScriptBuilder,
  priorityFee?: bigint,
): Promise<string> => {
  if (!rpcClient) throw new Error("Unable to reach RPC");

  const networkId = await getNetwork();

  // Prepare the property for the commit-reveal operations
  const address = await getWalletAddress();
  const scriptAddress = addressFromScriptPublicKey(
    script.createPayToScriptHashScript(),
    await getNetwork(),
  );
  if (!scriptAddress) {
    throw new Error("Failed to get script address from script");
  }

  const { entries } = await rpcClient.getUtxosByAddresses({
    addresses: [address],
  });

  const { transactions: commitTransactions } = await createTransactions({
    changeAddress: address,
    entries,
    outputs: [
      {
        address: scriptAddress,
        amount: kaspaToSompi("0.3")!, // 0.3 KAS is the amount for creating a utxo, it can not be lower than 0.2 KAS
      },
    ],
    priorityFee: priorityFee ?? BigInt(0),
    networkId,
  });

  const [commitTransaction] = commitTransactions;

  const commitTxId = await getKaspaProvider().request(
    "kas:sign_and_broadcast_tx",
    {
      networkId,
      txJson: commitTransaction.serializeToSafeJSON(),
    },
  );

  return commitTxId;
};

/**
 * Performs only the reveal phase of a commit-reveal operation for script
 * @param commitTxId Transaction ID of the commit transaction
 * @param script script to be revealed
 * @param priorityFee Optional priority fee for the reveal transaction
 * @return Transaction ID of the reveal transaction
 */
export const revealScript = async (
  commitTxId: string,
  script: ScriptBuilder,
  priorityFee?: bigint,
): Promise<string> => {
  if (!rpcClient) throw new Error("Unable to reach RPC");

  const scriptAddress = addressFromScriptPublicKey(
    script.createPayToScriptHashScript(),
    await getNetwork(),
  );
  if (!scriptAddress) {
    throw new Error("Failed to get script address from script");
  }

  // Wait for the commit transaction to be confirmed
  let retryCount = 0;
  let scriptUtxo: IUtxoEntry | undefined = undefined;
  while (!scriptUtxo) {
    if (retryCount > 10) {
      throw new Error("Timeout: Unable to find the commit script UTXO");
    }

    const scriptAddressUTXOs = await getUtxosByAddress(
      scriptAddress.toString(),
    );
    scriptUtxo = scriptAddressUTXOs.find(
      (utxo) => utxo.outpoint.transactionId === commitTxId,
    );
    if (!scriptUtxo) {
      await sleep(1000);
    }
    retryCount++;
  }

  // Reveal the script
  const { transactions: revealTransactions } = await createTransactions({
    changeAddress: await getWalletAddress(),
    priorityEntries: [scriptUtxo],
    entries: [scriptUtxo],
    outputs: [],
    priorityFee: priorityFee ?? BigInt(0),
  });

  const [revealTransaction] = revealTransactions;
  const revealTxId = await getKaspaProvider().request(
    "kas:sign_and_broadcast_tx",
    {
      networkId: await getNetwork(),
      txJson: revealTransaction.serializeToSafeJSON(),
      scripts: [
        {
          inputIndex: 0,
          scriptHex: script.toString(),
        },
      ],
    },
  );

  return revealTxId;
};

/**
 * Builds a commit-reveal script for a specific protocol and action
 * @param protocol The protocol name (e.g., "KRC20", "KRC721")
 * @param protocolAction The action to be performed (e.g., "mint", "list")
 * @returns The script for the commit-reveal operation
 */
export const buildRevealCommitScript = async (
  protocol: string,
  protocolAction: string,
) => {
  const publicKeyHex = await getPublicKey();
  const publicKey = new PublicKey(publicKeyHex);
  const script = new ScriptBuilder()
    .addData(publicKey.toXOnlyPublicKey().toString())
    .addOp(Opcodes.OpCheckSig)
    .addOp(Opcodes.OpFalse)
    .addOp(Opcodes.OpIf)
    .addData(new TextEncoder().encode(protocol))
    .addI64(BigInt(0))
    .addData(new TextEncoder().encode(protocolAction))
    .addOp(Opcodes.OpEndIf);

  return script;
};

// -----------------------------------------------------------------------
// ----------------------------Listeners----------------------------------
// -----------------------------------------------------------------------

/**
 * Registers event handler for performing actions when wallet events occur
 * @param method Event method (e.g., "kas:network_changed", "kas:account_changed" or "kas:balance_changed")
 * @param handler Event handler
 */
export const setEventListener = (
  method: ListenerMethod,
  handler: IWalletEventHandler,
): void => {
  listeners[method].add(handler);
};

/**
 * Removes all the event listeners
 */
export const removeEventListeners = (): void => {
  for (const method in listeners) {
    const typedMethod = method as ListenerMethod;
    listeners[typedMethod].clear();
  }
};
