import init, { Encoding, RpcClient } from "./wasm/kaspa";
import { config } from "./config";
import { getNetwork } from "./index";

export let rpcClient: RpcClient | undefined;

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

  await rpcClient.connect();
};

export const watchBalanceChanged = (address: string) => {
  if (!rpcClient) throw new Error("RPC client is not connected");

  // Emit the initial balance when the account is changed
  rpcClient.getBalanceByAddress({ address }).then((balanceResponse) => {
    window.postMessage({
      id: "kas:balance_changed",
      response: Number(balanceResponse?.balance ?? 0),
    });
  });

  // Remove existing event listeners as it only allows one listener at a time
  rpcClient.removeEventListener("utxos-changed");
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
  await init(config.wasm).then(connectToRPC);
})();
