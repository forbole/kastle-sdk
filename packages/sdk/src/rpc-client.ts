import init, { Encoding, IUtxosChanged, RpcClient } from "./wasm/kaspa";
import { config } from "./config";
import {
  getNetwork,
  getWalletAddress,
  WalletEventHandlersInterface,
} from "./index";

export let rpcClient: RpcClient | undefined;
export const listeners = new Set<WalletEventHandlersInterface>();
let addressToWatch: string;

export const connectToRPC = async () => {
  if (rpcClient?.isConnected) {
    rpcClient.removeAllEventListeners();
    await rpcClient.disconnect();
  }

  let networkId = await getNetwork();

  rpcClient = new RpcClient({
    url: config.rpcEndpoints[networkId],
    encoding: Encoding.Borsh,
    networkId: networkId,
  });

  rpcClient.addEventListener("utxos-changed", listenBalanceChange);

  await rpcClient.connect();
};

export const updateWatchedAddress = async () => {
  try {
    addressToWatch = await getWalletAddress();
    rpcClient?.subscribeUtxosChanged([addressToWatch]);
  } catch (error) {
    console.error(error);
  }
};

const listenBalanceChange = (event: IUtxosChanged) => {
  for (const listener of listeners) {
    listener({ id: "kas:balance_changed", response: null });
  }
};

(async () => {
  await init(config.wasm).then(connectToRPC);
})();
