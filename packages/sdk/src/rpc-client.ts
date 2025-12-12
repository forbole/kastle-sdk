import init, { Encoding, RpcClient } from "./wasm/kaspa";
import { config } from "./config";
import { getNetwork } from "./index";
import { sleep } from "./utils";

// Initialize WASM module independently
let wasmInitialized = false;
export const wasmReady: Promise<void> = (async () => {
  if (!wasmInitialized) {
    await init(config.wasm);
    wasmInitialized = true;
  }
})();

export let rpcClient: RpcClient | undefined;

export const connectToRPC = async () => {
  // Ensure WASM is initialized before connecting to RPC
  await wasmReady;

  if (rpcClient?.isConnected) {
    rpcClient.removeAllEventListeners();
    await rpcClient.disconnect();
  }

  const networkId = await getNetwork();

  rpcClient = new RpcClient({
    url: config.rpcEndpoints[networkId],
    encoding: Encoding.Borsh,
    networkId,
  });

  await rpcClient.connect();
};

// TODO: have a better way to handle rpc client connection
const waitForRPCConnected = async () => {
  while (!rpcClient?.isConnected) {
    await sleep(100);
  }
};

export const watchBalanceChanged = async (address: string | null) => {
  if (!rpcClient) throw new Error("RPC client is not connected");
  await waitForRPCConnected();

  // Remove existing event listeners as it only allows one listener at a time
  rpcClient.removeEventListener("utxos-changed");

  if (!address) {
    return;
  }

  // Emit the initial balance when the account is changed
  const balanceResponse = await rpcClient.getBalanceByAddress({ address });
  window.postMessage({
    id: "kas:balance_changed",
    response: Number(balanceResponse?.balance ?? 0),
  });

  rpcClient.subscribeUtxosChanged([address]);
  rpcClient.addEventListener("utxos-changed", async (event) => {
    const balanceResponse = await rpcClient?.getBalanceByAddress({ address });
    window.postMessage({
      id: "kas:balance_changed",
      response: Number(balanceResponse?.balance ?? 0),
    });
  });
};

(async () => {
  wasmReady.then(connectToRPC);
})();
