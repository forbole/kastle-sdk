export type IWalletEventHandler = (data: any) => void;
export type NetworkId = "mainnet" | "testnet-10";

export interface KaspaProvider {
  connect: () => Promise<boolean>;
  disconnect: () => Promise<void>;
  request: (method: string, args?: any) => Promise<any>;
}
