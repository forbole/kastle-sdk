import { IWalletEventHandler } from "./interfaces";
import { watchBalanceChanged, connectToRPC } from "./rpc-client";
import { getWalletAddress } from "./index";

export const listeners = {
  "kas:network_changed": new Set<IWalletEventHandler>(),
  "kas:account_changed": new Set<IWalletEventHandler>(),
  "kas:balance_changed": new Set<IWalletEventHandler>(),
  "kas:host_connected": new Set<IWalletEventHandler>(),
};

export type ListenerMethod = keyof typeof listeners;

window.addEventListener("message", async (event) => {
  if (event.data?.id === "kas:network_changed") {
    await connectToRPC();
    for (const listener of listeners["kas:network_changed"]) {
      listener(event.data.response);
    }
  }

  if (event.data?.id === "kas:account_changed") {
    const address = event.data.response;
    watchBalanceChanged(address);
    for (const listener of listeners["kas:account_changed"]) {
      listener(address);
    }
  }

  if (event.data?.id === "kas:balance_changed") {
    for (const listener of listeners["kas:balance_changed"]) {
      listener(event.data.response);
    }
  }

  if (event.data?.id === "kas:host_connected") {
    for (const listener of listeners["kas:host_connected"]) {
      listener(event.data.response);
    }
  }
});
