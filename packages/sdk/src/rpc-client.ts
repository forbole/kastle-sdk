import init, { Encoding, RpcClient } from "./wasm/kaspa";
import { config } from "./config";
import { getNetwork } from "./index";
import { getKaspaProvider } from "./kastle/provider";

// Initialize WASM module independently
let wasmInitialized = false;
export const wasmReady: Promise<void> = (async () => {
  if (!wasmInitialized) {
    try {
      await init(config.wasm);
      wasmInitialized = true;
    } catch (e) {
      console.error(
        "[kastle-sdk] Failed to load WASM (possible CORS issue):",
        e,
      );
      // Don't hang forever — resolve so callers can proceed and fail gracefully
    }
  }
})();

/**
 * Creates a one-shot RPC client for the current network,
 * runs the given query, then disconnects immediately.
 */
export const withRpc = async <T>(
  fn: (client: RpcClient) => Promise<T>,
): Promise<T> => {
  await wasmReady;
  const networkId = await getNetwork();
  const url =
    config.rpcEndpoints[networkId as keyof typeof config.rpcEndpoints];
  if (!url) {
    throw new Error(
      `[kastle-sdk] No RPC endpoint configured for network: ${networkId}`,
    );
  }
  const client = new RpcClient({
    url,
    encoding: Encoding.Borsh,
    networkId,
  });
  await client.connect();
  try {
    return await fn(client);
  } finally {
    await client.disconnect();
  }
};

let balancePollInterval: ReturnType<typeof setInterval> | undefined;
let lastBalance: string | undefined;

export const resetLastBalance = () => {
  lastBalance = undefined;
};

/**
 * Fetches the current balance once and emits kas:balance_changed if changed.
 * Called directly by built-in events (account_changed, network_changed).
 */
export const fetchBalance = async () => {
  try {
    const provider = await getKaspaProvider();
    const { balance } = await provider.request("kas:get_balance");
    if (balance !== lastBalance) {
      lastBalance = balance;
      window.postMessage({
        id: "kas:balance_changed",
        response: BigInt(balance),
      });
    }
  } catch (_) {}
};

/**
 * Starts a slow fallback polling interval to catch balance changes
 * not covered by built-in events (e.g. incoming transactions).
 * Should be called once on connect / account change.
 */
export const watchBalanceChanged = async (address: string | null) => {
  // Clear any existing polling
  if (balancePollInterval !== undefined) {
    clearInterval(balancePollInterval);
    balancePollInterval = undefined;
  }
  lastBalance = undefined;

  if (!address) return;

  // Immediate fetch via built-in event path
  await fetchBalance();
  // Fallback polling every 5s for transaction-based balance changes
  balancePollInterval = setInterval(fetchBalance, 5000);
};
