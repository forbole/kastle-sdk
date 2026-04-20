import { IWalletEventHandler } from "./interfaces";
import { watchBalanceChanged } from "./rpc-client";
import { getKaspaProvider } from "./kastle/provider";

export const listeners = {
  "kas:network_changed": new Set<IWalletEventHandler>(),
  "kas:account_changed": new Set<IWalletEventHandler>(),
  "kas:balance_changed": new Set<IWalletEventHandler>(),
  "kas:host_connected": new Set<IWalletEventHandler>(),
};

export type ListenerMethod = keyof typeof listeners;

// Internal handlers registered on kastle provider — kept as references so they can be removed
const internalAccountChangedHandler = (address: string | null) => {
  watchBalanceChanged(address);
  for (const listener of listeners["kas:account_changed"]) {
    listener(address);
  }
};

const internalNetworkChangedHandler = async (network: string) => {
  const provider = await getKaspaProvider();
  const { address } = await provider.request("kas:get_account");
  await watchBalanceChanged(address);
  for (const listener of listeners["kas:network_changed"]) {
    listener(network);
  }
};

let kastleListenersRegistered = false;

export const ensureKastleListeners = async () => {
  if (kastleListenersRegistered) return;
  kastleListenersRegistered = true;
  const provider = await getKaspaProvider();
  provider.on("kas:account_changed", internalAccountChangedHandler);
  provider.on("kas:network_changed", internalNetworkChangedHandler);
};

export const removeKastleListeners = async () => {
  if (!kastleListenersRegistered) return;
  kastleListenersRegistered = false;
  const provider = await getKaspaProvider();
  provider.removeListener("kas:account_changed", internalAccountChangedHandler);
  provider.removeListener("kas:network_changed", internalNetworkChangedHandler);
};

// Register kastle native listeners immediately
ensureKastleListeners();

// kas:balance_changed is emitted by our own polling via window.postMessage
window.addEventListener("message", (event) => {
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
