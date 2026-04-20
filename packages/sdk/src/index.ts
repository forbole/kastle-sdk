import { getKaspaProvider } from "./kastle/provider";
import {
  createTransaction,
  createTransactions,
  ScriptBuilder,
  PublicKey,
  Opcodes,
  addressFromScriptPublicKey,
  kaspaToSompi,
  IUtxoEntry,
  IPaymentOutput,
  Transaction,
  payToAddressScript,
} from "./wasm/kaspa";
import { withRpc, watchBalanceChanged, wasmReady } from "./rpc-client";
import {
  IWalletEventHandler,
  NetworkId,
  IAccount,
  IBalance,
  IUtxoEntriesResponse,
  IBuildTransactionResponse,
  ISignScript,
  ICommitRevealOptions,
  ICommitRevealResponse,
  KastleEventType,
} from "./interfaces";
import { listeners, ListenerMethod, removeKastleListeners } from "./listener";
import * as wasm from "./wasm/kaspa";

// ------------------------------------------------------------------------
// --------------------------Basic functions-------------------------------
// ------------------------------------------------------------------------

/**
 * Checks if the wallet provider is installed
 */
export const isWalletInstalled = async (): Promise<boolean> => {
  try {
    await getKaspaProvider();
    return true;
  } catch (_) {
    return false;
  }
};

/**
 * Disconnects the wallet from the platform
 */
export const disconnect = async (): Promise<void> => {
  return (await getKaspaProvider()).disconnect();
};

/**
 * Connect the wallet for the platform
 */
export const connect = async (): Promise<boolean> => {
  const provider = await getKaspaProvider();
  const connected = await provider.request("kas:connect");
  await watchBalanceChanged(await getWalletAddress());
  return connected;
};

/**
 * Returns the current wallet version in SemVer format.
 * Build metadata suffix identifies the platform (+extension or +mobile).
 */
export const getVersion = async (): Promise<string> => {
  return (await getKaspaProvider()).request("kas:get_version");
};

/**
 * Returns the full account object containing address and publicKey
 */
export const getAccount = async (): Promise<IAccount> => {
  return (await getKaspaProvider()).request("kas:get_account");
};

/**
 * Returns the currently connected wallet address
 */
export const getWalletAddress = async (): Promise<string> => {
  const account = await getAccount();
  return account.address;
};

/**
 * Retrieves the public key associated with the wallet
 */
export const getPublicKey = async (): Promise<string> => {
  const account = await getAccount();
  return account.publicKey;
};

/**
 * Returns the active Kaspa network (mainnet, testnet-10, testnet-11)
 */
export const getNetwork = async (): Promise<NetworkId> => {
  return (await getKaspaProvider()).request("kas:get_network");
};

/**
 * Requests a network switch to a different Kaspa chain
 * @param networkId The network to switch to ("mainnet" | "testnet-10")
 */
export const switchNetwork = async (
  networkId: NetworkId,
): Promise<NetworkId> => {
  return (await getKaspaProvider()).request("kas:switch_network", networkId);
};

/**
 * Fetches the current balance of the wallet in sompi.
 * Returns the balance as bigint for backward compatibility.
 * Use getBalanceInfo() to get the full IBalance object.
 */
export const getBalance = async (): Promise<bigint> => {
  const result: IBalance = await (
    await getKaspaProvider()
  ).request("kas:get_balance");
  return BigInt(result.balance);
};

/**
 * Returns all UTXOs for the current account using the wallet's native API.
 * No RPC or WASM needed.
 */
export const getUtxoEntries = async (): Promise<IUtxoEntriesResponse> => {
  return (await getKaspaProvider()).request("kas:get_utxo_entries");
};

/**
 * Sends Kaspa (KAS) to another address.
 * Builds, signs, and broadcasts in one call — no RPC or WASM needed.
 * @param toAddress Recipient address
 * @param amountSompi Amount to send in sompi
 * @param options Optional parameters including priorityFee (in sompi)
 */
export const sendKaspa = async (
  toAddress: string,
  amountSompi: number | bigint,
  options?: { priorityFee?: number | bigint },
): Promise<string> => {
  return (await getKaspaProvider()).request("kas:send_sompi", {
    toAddress,
    sompi: Number(amountSompi),
    options: options
      ? {
          ...options,
          priorityFee:
            options.priorityFee !== undefined
              ? Number(options.priorityFee)
              : undefined,
        }
      : undefined,
  });
};

/**
 * Signs a message using the wallet's private key and returns the signature
 * @param msg Message to sign
 */
export const signMessage = async (msg: string): Promise<string> => {
  return (await getKaspaProvider()).request("kas:sign_message", msg);
};

/**
 * Retrieves unspent utxo by an address
 * @param address address
 */
export const getUtxosByAddress = async (address: string) => {
  const { entries } = await withRpc((client) =>
    client.getUtxosByAddresses({ addresses: [address] }),
  );
  return entries;
};

/**
 * Builds a transaction from UTXO entries and outputs using WASM.
 * Returns a serialized transaction JSON string ready for signing.
 * @param entries UTXO entries to use as inputs
 * @param outputs Payment outputs
 * @param payload Optional hex payload
 * @returns Serialized transaction JSON string
 */
export const buildTransaction = (
  entries: IUtxoEntry[],
  outputs: IPaymentOutput[],
  payload?: string,
): string => {
  const transaction = createTransaction(entries, outputs, BigInt(0), payload);
  return transaction.serializeToSafeJSON();
};

/**
 * Builds a transaction from explicit UTXO entries via the wallet's kas:build_transaction API.
 * @param entries UTXO entries to be used as inputs
 * @param outputs Payment outputs to be included in the transaction
 * @param payload Optional hex payload for the transaction
 * @return Build transaction response with networkId and transactions
 */
export const buildTransactionFromUtxos = async (
  entries: IUtxoEntry[],
  outputs: IPaymentOutput[],
  payload?: string,
): Promise<IBuildTransactionResponse> => {
  return (await getKaspaProvider()).request("kas:build_transaction", {
    outputs: outputs.map((o) => ({
      address: o.address,
      amount: o.amount.toString(),
    })),
    inputs: entries.map((e) => ({
      address: e.address?.toString(),
      outpoint: e.outpoint,
      amount: e.amount.toString(),
      scriptPublicKey: e.scriptPublicKey,
      blockDaaScore: e.blockDaaScore.toString(),
      isCoinbase: e.isCoinbase,
    })),
    payload,
  });
};

/**
 * Signs a transaction and broadcasts it to the network. Opens a confirmation popup.
 * @param networkId The network the transaction was built for
 * @param txJson Transaction safe-serialized JSON string
 * @param scripts Optional signing scripts (e.g. for P2SH)
 * @return Transaction ID of the sent transaction
 */
export const signAndBroadcastTx = async (
  networkId: NetworkId,
  txJson: string,
  scripts?: ISignScript[],
): Promise<string> => {
  return (await getKaspaProvider()).request("kas:sign_and_broadcast_tx", {
    networkId,
    txJson,
    scripts,
  });
};

/**
 * Signs a transaction without broadcasting it. Returns the signed transaction as JSON.
 * Useful for marketplace flows (e.g. SingleAnyOneCanPay).
 * @param networkId The network the transaction was built for
 * @param txJson Transaction safe-serialized JSON string
 * @param scripts Optional signing scripts
 * @return Signed transaction JSON string
 */
export const signTx = async (
  networkId: NetworkId,
  txJson: string,
  scripts?: ISignScript[],
): Promise<string> => {
  return (await getKaspaProvider()).request("kas:sign_tx", {
    networkId,
    txJson,
    scripts,
  });
};

/**
 * Signs a transaction and broadcasts it to the network.
 * @deprecated Prefer signAndBroadcastTx() which accepts networkId explicitly.
 */
export const sendTransaction = async (txJson: string): Promise<string> => {
  return (await getKaspaProvider()).request("kas:sign_and_broadcast_tx", {
    networkId: await getNetwork(),
    txJson,
  });
};

/**
 * Sends a transaction with extra outputs
 * @param txJson Transaction safe-serialized JSON string
 * @param extraOutputs Extra outputs to be added to the transaction
 * @param priorityFee Priority fee for the transaction
 * @return Transaction ID of the sent transaction
 */
export const sendTransactionWithExtraOutputs = async (
  txJson: string,
  extraOutputs: { address: string; value: bigint }[],
  priorityFee: bigint,
) => {
  await wasmReady;
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

    transaction.inputs = [
      ...transaction.inputs,
      {
        previousOutpoint: inputUtxo.outpoint,
        sequence: BigInt(0),
        sigOpCount: 1,
        utxo: inputUtxo,
      },
    ];

    inputsBalance += inputUtxo.amount;
    changeAmount = inputsBalance - totalOutputsBalance;
  }

  // Add extra outputs to the transaction
  transaction.outputs = [
    ...transaction.outputs,
    ...extraOutputs.map((output) => ({
      scriptPublicKey: payToAddressScript(output.address),
      value: output.value,
    })),
  ];

  // Add change output to the transaction (only if non-zero)
  if (changeAmount > BigInt(0)) {
    transaction.outputs = [
      ...transaction.outputs,
      {
        scriptPublicKey: payToAddressScript(await getWalletAddress()),
        value: changeAmount,
      },
    ];
  }

  const txId = await (
    await getKaspaProvider()
  ).request("kas:sign_and_broadcast_tx", {
    networkId: await getNetwork(),
    txJson: transaction.serializeToSafeJSON(),
  });

  return txId;
};

// ------------------------------------------------------------------------
// --------------------------Script functions------------------------------
// ------------------------------------------------------------------------

export enum SignType {
  All = "All",
  None = "None",
  Single = "Single",
  AllAnyOneCanPay = "AllAnyOneCanPay",
  NoneAnyOneCanPay = "NoneAnyOneCanPay",
  SingleAnyOneCanPay = "SingleAnyOneCanPay",
}

export type ScriptOption = {
  inputIndex: number;
  script?: ScriptBuilder;
  signType?: SignType;
};

/**
 * Signs a PSKT transaction using the wallet's native signTx API.
 * @param txJson Transaction safe-serialized JSON string
 * @param scriptOptions Array of script options for signing
 * @return Signed transaction JSON string
 */
export const signPskt = async (
  txJson: string,
  scriptOptions?: ScriptOption[],
): Promise<string> => {
  const networkId = await getNetwork();
  const scripts = scriptOptions?.map((scriptOption) => ({
    inputIndex: scriptOption.inputIndex,
    scriptHex: scriptOption.script?.toString() ?? "",
    signType: scriptOption.signType ?? SignType.All,
  }));

  return (await getKaspaProvider()).request("kas:sign_tx", {
    networkId,
    txJson,
    scripts,
  });
};

/**
 * Performs a KRC-20 commit-reveal operation using the wallet's native API.
 * Kastle handles both steps — no WASM needed.
 * @param networkId The network to perform the operation on
 * @param namespace Protocol namespace (e.g. "kasplex")
 * @param data JSON-stringified protocol action payload
 * @param options Optional priority fees for commit and reveal transactions
 */
export const commitReveal = async (
  networkId: NetworkId,
  namespace: string,
  data: string,
  options?: ICommitRevealOptions,
): Promise<ICommitRevealResponse> => {
  return (await getKaspaProvider()).request("kas:commit_reveal", {
    networkId,
    namespace,
    data,
    options,
  });
};

type LegacyCommitRevealOptions = {
  commitPriorityFee?: bigint;
  revealPriorityFee?: bigint;
};

/**
 * Commits and reveals a script using the RPC client and WASM.
 * @deprecated Prefer commitReveal() which uses the wallet's native API and requires no WASM.
 * @param script script to be used for the commit-reveal operation
 * @param options Optional commit-reveal options
 * @return An object containing the commit and reveal transaction IDs, or an error if one occurred
 */
export const doCommitReveal = async (
  script: ScriptBuilder,
  options?: LegacyCommitRevealOptions,
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
  await wasmReady;

  const networkId = await getNetwork();
  const address = await getWalletAddress();
  const scriptAddress = addressFromScriptPublicKey(
    script.createPayToScriptHashScript(),
    networkId,
  );

  if (!scriptAddress) {
    throw new Error("Failed to get script address from script");
  }

  const { transactions: commitTransactions } = await withRpc(async (client) => {
    const { entries } = await client.getUtxosByAddresses({
      addresses: [address],
    });
    return createTransactions({
      changeAddress: address,
      entries,
      outputs: [{ address: scriptAddress, amount: kaspaToSompi("0.2")! }],
      priorityFee: priorityFee ?? BigInt(0),
      networkId,
    });
  });

  const [commitTransaction] = commitTransactions;
  return (await getKaspaProvider()).request("kas:sign_and_broadcast_tx", {
    networkId,
    txJson: commitTransaction.serializeToSafeJSON(),
  });
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
  await wasmReady;

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
    if (retryCount > 30) {
      throw new Error("Commit transaction not confirmed in time");
    }
    scriptUtxo = await getCommitScriptUtxo(script, commitTxId);
    if (scriptUtxo) break;
    await new Promise((r) => setTimeout(r, 2000));
    retryCount++;
  }

  const address = await getWalletAddress();
  const networkId = await getNetwork();

  const { transactions: revealTransactions } = await withRpc(async (client) => {
    const { entries } = await client.getUtxosByAddresses({
      addresses: [address],
    });
    return createTransactions({
      changeAddress: address,
      priorityEntries: [scriptUtxo!],
      entries,
      outputs: [],
      priorityFee: priorityFee ?? BigInt(0),
      networkId,
    });
  });

  const [revealTransaction] = revealTransactions;
  return (await getKaspaProvider()).request("kas:sign_and_broadcast_tx", {
    networkId,
    txJson: revealTransaction.serializeToSafeJSON(),
    scripts: [{ inputIndex: 0, scriptHex: script.toString() }],
  });
};

/**
 * Builds a commit-reveal script for a specific protocol and action
 * @param publicKeyHex The public key in hex format to have permission to reveal the script
 * @param protocol The protocol name (e.g., "kasplex", "kspr", "kns")
 * @param protocolAction The action to be performed (e.g., "mint", "list")
 * @returns The script for the commit-reveal operation
 */
export const buildRevealCommitScript = (
  publicKeyHex: string,
  protocol: string,
  protocolAction: string,
) => {
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

/**
 * Retrieves the UTXO for a given commit transaction ID
 * @param script The script that was used for the commit transaction
 * @param commitTxId The transaction ID of the commit transaction
 * @returns The UTXO entry associated with the commit transaction ID for the script
 */
export const getCommitScriptUtxo = async (
  script: ScriptBuilder,
  commitTxId: string,
) => {
  await wasmReady;

  const scriptAddress = addressFromScriptPublicKey(
    script.createPayToScriptHashScript(),
    await getNetwork(),
  );
  if (!scriptAddress) {
    throw new Error("Failed to get script address from script");
  }

  const scriptAddressUTXOs = await getUtxosByAddress(scriptAddress.toString());

  return scriptAddressUTXOs.find(
    (utxo) => utxo.outpoint.transactionId === commitTxId,
  );
};

// -----------------------------------------------------------------------
// ----------------------------Listeners----------------------------------
// -----------------------------------------------------------------------

/**
 * Registers an event listener on the Kastle provider.
 * Supports both KasWare-compatible events ("accountsChanged", "networkChanged")
 * and KIP-style events ("kas:account_changed", "kas:network_changed").
 * @param event Event name
 * @param handler Event handler
 */
export const on = async (
  event: KastleEventType | string,
  handler: IWalletEventHandler,
): Promise<void> => {
  (await getKaspaProvider()).on(event, handler);
};

/**
 * Removes an event listener from the Kastle provider.
 * @param event Event name
 * @param handler Event handler to remove
 */
export const removeListener = async (
  event: KastleEventType | string,
  handler: IWalletEventHandler,
): Promise<void> => {
  (await getKaspaProvider()).removeListener(event, handler);
};

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
  removeKastleListeners();
};

/**
 * Removes a specific event listener
 * @param method Event method (e.g., "kas:network_changed", "kas:account_changed" or "kas:balance_changed")
 * @param handler Event handler
 */
export const removeEventListener = (
  method: ListenerMethod,
  handler: IWalletEventHandler,
): void => {
  listeners[method].delete(handler);
  // If no more handlers for both native events, unregister kastle's internal listeners
  if (
    listeners["kas:account_changed"].size === 0 &&
    listeners["kas:network_changed"].size === 0
  ) {
    removeKastleListeners();
  }
};

// ------------------------------------------------------------------------
// --------------------------WASM Utilities--------------------------------
// ------------------------------------------------------------------------

/**
 * Promise that resolves when the Kaspa WASM module is fully loaded and initialized
 * @example
 * ```typescript
 * await wasmReady;
 * const tx = kaspaWasm.createTransaction(...);
 * ```
 */
export { wasmReady } from "./rpc-client";

/**
 * The Kaspa WASM module
 * Note: Ensure wasmReady Promise is resolved before using this
 * @example
 * ```typescript
 * import { kaspaWasm, wasmReady } from 'kastle-sdk';
 *
 * await wasmReady;
 * const address = kaspaWasm.addressFromScriptPublicKey(...);
 * ```
 */
export const kaspaWasm = wasm;
