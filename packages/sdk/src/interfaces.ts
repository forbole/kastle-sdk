export type IWalletEventHandler = (data: any) => void;
export type NetworkId = "mainnet" | "testnet-10" | "testnet-11";

// ---- Response types ----

export interface IAccount {
  address: string;
  publicKey: string;
}

export interface IBalance {
  balance: string;
}

export interface IUtxoOutpoint {
  transactionId: string;
  index: number;
}

export interface IUtxoEntry {
  outpoint: IUtxoOutpoint;
  amount: string;
  isCoinbase: boolean;
}

export interface IUtxoEntriesResponse {
  entries: IUtxoEntry[];
}

export interface IBuildTransactionOutput {
  address: string;
  amount: string;
}

export interface IBuildTransactionOptions {
  priorityFee?: string;
  payload?: string;
  inputs?: IUtxoEntry[];
}

export interface IBuiltTransaction {
  id: string;
  feeAmount: string;
  changeAmount: string;
  txJson: string;
}

export interface IBuildTransactionResponse {
  networkId: NetworkId;
  transactions: IBuiltTransaction[];
}

export interface ISignScript {
  inputIndex: number;
  scriptHex: string;
  signType?: string;
}

export interface ICommitRevealOptions {
  commitPriorityFee?: string;
  revealPriorityFee?: string;
}

export interface ICommitRevealResponse {
  commitTxId: string;
  revealTxId: string;
}

// ---- KIP-style request method map ----

export type KipMethod =
  | "kas:connect"
  | "kas:get_version"
  | "kas:get_account"
  | "kas:get_network"
  | "kas:switch_network"
  | "kas:get_balance"
  | "kas:get_utxo_entries"
  | "kas:send_sompi"
  | "kas:build_transaction"
  | "kas:sign_and_broadcast_tx"
  | "kas:sign_tx"
  | "kas:sign_message"
  | "kas:commit_reveal";

// ---- Event types ----

export type KastleEventType =
  | "accountsChanged"
  | "networkChanged"
  | "kas:account_changed"
  | "kas:network_changed";

export interface KaspaProvider {
  // Core
  connect: () => Promise<boolean>;
  disconnect: () => Promise<void>;
  request: (method: KipMethod | string, args?: any) => Promise<any>;

  // Direct methods
  getVersion: () => Promise<string>;
  getAccount: () => Promise<IAccount>;
  getNetwork: () => Promise<NetworkId>;
  switchNetwork: (networkId: NetworkId) => Promise<NetworkId>;
  getBalance: () => Promise<IBalance>;
  getUtxoEntries: () => Promise<IUtxoEntriesResponse>;
  sendKaspa: (
    toAddress: string,
    sompi: number | bigint,
    options?: { priorityFee?: number | bigint },
  ) => Promise<string>;
  buildTransaction: (
    outputs: IBuildTransactionOutput[],
    options?: IBuildTransactionOptions,
  ) => Promise<IBuildTransactionResponse>;
  signAndBroadcastTx: (
    networkId: NetworkId,
    txJson: string,
    scripts?: ISignScript[],
  ) => Promise<string>;
  signTx: (
    networkId: NetworkId,
    txJson: string,
    scripts?: ISignScript[],
  ) => Promise<string>;
  signMessage: (message: string) => Promise<string>;
  commitReveal: (
    networkId: NetworkId,
    namespace: string,
    data: string,
    options?: ICommitRevealOptions,
  ) => Promise<ICommitRevealResponse>;

  // Events
  on: (event: KastleEventType | string, handler: IWalletEventHandler) => void;
  removeListener: (
    event: KastleEventType | string,
    handler: IWalletEventHandler,
  ) => void;
}
