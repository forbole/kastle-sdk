import { KaspaProvider } from "./provider";

type Network = "mainnet" | "testnet-10";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const getKaspaProvider = (): KaspaProvider | undefined =>
  (window as any).kastle;

/**
 * Checks if the wallet provider is installed
 */
export const isWalletInstalled = async (): Promise<boolean> => {
  await sleep(100);
  return !!(window as any).kastle;
};

/**
 * Disconnects the wallet from the platform
 * @param origin Optional origin parameter
 */
export const disconnect = async (origin?: string): Promise<void> => {
  return getKaspaProvider()?.disconnect();
};

/**
 * Connect the wallet for the platform
 * @param network Optional network to connect the wallet to
 */
export const connect = async (
  network?: "mainnet" | "testnet-10",
): Promise<void> => {
  return getKaspaProvider()?.connect();
};

/**
 * Returns the currently connected wallet address
 */
export const getWalletAddress = async (): Promise<string> => {
  return getKaspaProvider()?.request("get-wallet-address");
};

/**
 * Returns the active Kaspa network (mainnet, testnet, devnet)
 */
export const getNetwork = async (): Promise<string> => {
  return getKaspaProvider()?.request("get-network");
};

/**
 * Requests a network switch to a different Kaspa chain
 * @param network The network to switch to
 */
export const switchNetwork = async (network: Network): Promise<boolean> => {
  const iconElement =
    document.querySelector('link[rel="icon"]') ||
    document.querySelector('link[rel="shortcut icon"]');

  let iconUrl: string | undefined;
  if (iconElement instanceof HTMLLinkElement) {
    iconUrl = iconElement.href;
  }

  return getKaspaProvider()?.request("switch-network", {
    network,
    name: document.title,
    icon: iconUrl,
  });
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
  return getKaspaProvider()?.request("send-kaspa", {
    toAddress,
    amountSompi,
    options,
  });
};

/**
 * Fetches the current balance of the wallet
 */
export const getBalance = async (): Promise<number> => {
  return getKaspaProvider()?.request("get-balance");
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
  return getKaspaProvider()?.request("sign-pskt", {
    txJsonString,
    submit,
    protocol,
    protocolAction,
    priorityFee,
  });
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
  return getKaspaProvider()?.request("do-commit-reveal", {
    actionScript,
    options,
  });
};

// TODO ask KaspaCom
type RevealOptions = any;

/**
 * Performs only the reveal phase of a commit-reveal operation
 * @param options Reveal options
 */
export const doRevealOnly = async (options: RevealOptions): Promise<string> => {
  return getKaspaProvider()?.request("do-reveal-only", { options });
};

/**
 * Retrieves the public key associated with the wallet
 */
export const getPublicKey = async (): Promise<string> => {
  return getKaspaProvider()?.request("get-public-key");
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
  return getKaspaProvider()?.request("sign-message", { msg, type });
};

// TODO ask KaspaCom
type WalletEventHandlersInterface = (event: any) => void;

/**
 * Retrieves unspent utxo for wallet
 * @param p2shAddress Optional p2sh address
 */
export const getUtxoAddress = async (p2shAddress?: string): Promise<any[]> => {
  return getKaspaProvider()?.request("get-utxo-address", { p2shAddress });
};

/**
 * Compounds wallet utxo (optional implementation)
 */
export const compoundUtxo = async (): Promise<string> => {
  return getKaspaProvider()?.request("compound-utxo");
};

/**
 * Registers event listeners for account/network/balance changes
 * @param eventListeners Event listener interface
 */
export const setEventListeners = (
  eventListeners: WalletEventHandlersInterface,
): void => {
  // TODO: Implement event listener registration
};

/**
 * Removes event listeners when the user disconnects
 */
export const removeEventListeners = (): void => {
  // TODO: Implement event listener removal
};
