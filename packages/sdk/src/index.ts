import { getKaspaProvider, NetworkId } from "./provider";
import { createTransactions } from "./wasm/kaspa";
import {
  connectToRPC,
  listeners,
  rpcClient,
  updateWatchedAddress,
} from "./rpc-client";

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
 * @param origin Optional origin parameter
 */
export const disconnect = async (origin?: string): Promise<void> => {
  return getKaspaProvider().disconnect();
};

/**
 * Connect the wallet for the platform
 * @param networkId Optional network to connect the wallet to
 */
export const connect = async (
  networkId: NetworkId = "mainnet",
): Promise<boolean> => {
  const isSuccessful = await getKaspaProvider().connect(networkId);

  // Reconnect to the currently selected network
  if (isSuccessful) {
    await connectToRPC();
  }

  return isSuccessful;
};

/**
 * Returns the currently connected wallet address
 */
export const getWalletAddress = async (): Promise<string> => {
  let account: { address: string; publicKey: string } =
    await getKaspaProvider().request("get-account");

  return account.address;
};

/**
 * Retrieves the public key associated with the wallet
 */
export const getPublicKey = async (): Promise<string> => {
  let account: { address: string; publicKey: string } =
    await getKaspaProvider().request("get-account");

  return account.publicKey;
};

/**
 * Returns the active Kaspa network (mainnet, testnet)
 */
export const getNetwork = async (): Promise<NetworkId> => {
  return getKaspaProvider().request("get-network");
};

/**
 * Requests a network switch to a different Kaspa chain
 * @param networkId The network to switch to
 */
export const switchNetwork = async (networkId: NetworkId): Promise<boolean> => {
  let isSuccessful = await connect(networkId);

  // Reconnect to the currently selected network
  if (isSuccessful) {
    await connectToRPC();
  }

  return isSuccessful;
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

  return getKaspaProvider().request("sign-and-broadcast-tx", {
    networkId: await getNetwork(),
    txJson: transaction.serializeToSafeJSON(),
  });
};

// TODO ask KaspaCom
type ProtocolType = "kns" | "krc20" | "krc721";
// TODO ask KaspaCom
type PsktActions = string;

/**
 * Signs a PSKT transaction for KRC20/KRC721 transfers
 * @param txJsonString Transaction JSON string
 * @param submit Whether to submit the transaction after signing
 * @param protocol Protocol type
 * @param protocolAction Protocol action
 * @param priorityFee Optional priority fee
 */
export const signPskt = async (
  txJsonString: string,
  submit?: boolean,
  protocol?: ProtocolType,
  protocolAction?: PsktActions,
  priorityFee?: number,
): Promise<string> => {
  throw new Error("Not implemented");
};

// TODO ask KaspaCom, JSON?
type ProtocolScript = string;
type CommitRevealOptions = {
  priorityFee?: number;
  revealPriorityFee?: number;
  additionalOutput: Array<{ address: string; amount: number }>;
  commitTransactionId: string;
  revealPskt: {
    outputs: Array<{ address: string; amount: number }>;
    script: any; // TODO ask KaspaCom
  };
};

/**
 * Commits and reveals a transaction, used for minting/listing KRC assets
 * @param actionScript Protocol script for the action
 * @param options Optional commit-reveal options
 */
export const doCommitReveal = async (
  actionScript: ProtocolScript,
  options?: CommitRevealOptions,
): Promise<string> => {
  throw new Error("Not implemented");
};

// TODO ask KaspaCom
type RevealOptions = any;

/**
 * Performs only the reveal phase of a commit-reveal operation
 * @param options Reveal options
 */
export const doRevealOnly = async (options: RevealOptions): Promise<string> => {
  throw new Error("Not implemented");
};

/**
 * Signs a message using the wallet's private key and returns the signature
 * @param msg Message to sign
 * @param type Optional signature type
 */
export const signMessage = async (
  msg: string,
  type?: string,
): Promise<string> => {
  throw new Error("Not implemented");
};

/**
 * Retrieves unspent utxo for wallet
 * @param p2shAddress Optional p2sh address
 */
export const getUtxoAddress = async (p2shAddress?: string): Promise<any[]> => {
  if (!rpcClient) throw new Error("Unable to reach RPC");

  const address = p2shAddress ?? (await getWalletAddress());

  const { entries } = await rpcClient.getUtxosByAddresses({
    addresses: [address],
  });

  return entries;
};

/**
 * Compounds wallet utxo (optional implementation)
 */
export const compoundUtxo = async (): Promise<string> => {
  throw new Error("Not implemented");
};

window.addEventListener("message", async (event) => {
  const eventIdsToWatch = ["kas_networkChanged", "kas_accountChanged"];

  if (eventIdsToWatch.includes(event.data?.id)) {
    for (const listener of listeners) {
      listener({ id: event.data?.id, response: event.data?.response });
    }
  }

  if (event.data?.id === "kas_accountChanged") {
    await updateWatchedAddress();
  }
});

export type WalletEventHandlersInterface = (event: any) => void;

/**
 * Registers event listeners for account/network/balance changes
 * @param eventListeners Event listener interface
 */
export const setEventListeners = (
  eventListeners: WalletEventHandlersInterface,
): void => {
  listeners.add(eventListeners);
};

/**
 * Removes event listeners when the user disconnects
 */
export const removeEventListeners = (): void => {
  listeners.clear();
};
