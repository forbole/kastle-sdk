# @forbole/kastle-sdk

A JavaScript/TypeScript library for integrating Kaspa wallet functionality into web applications via the [Kastle](https://kastle.io) browser extension.

[![npm version](https://img.shields.io/npm/v/@forbole/kastle-sdk.svg)](https://www.npmjs.com/package/@forbole/kastle-sdk)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

## Installation

```bash
npm install @forbole/kastle-sdk
```

## Requirements

- The [Kastle](https://kastle.io) browser extension must be installed.
- A modern browser with WebAssembly support (for WASM-based features).

## Quick Start

```typescript
import { connect, getWalletAddress, getBalance, sendKaspa } from '@forbole/kastle-sdk';

// Connect wallet
const isConnected = await connect();

if (isConnected) {
  const address = await getWalletAddress();
  const balance = await getBalance(); // returns bigint (sompi)

  // Send 1 KAS (100,000,000 sompi)
  const txId = await sendKaspa(address, 100_000_000n);
  console.log('Transaction ID:', txId);
}
```

---

## API Reference

### Wallet Connection

#### `isWalletInstalled(): Promise<boolean>`
Returns `true` if the Kastle wallet extension is detected.

#### `connect(): Promise<boolean>`
Requests wallet connection. Opens a Kastle approval popup.

#### `disconnect(): Promise<void>`
Disconnects the wallet.

#### `getVersion(): Promise<string>`
Returns the wallet version string in SemVer format (e.g. `1.13.1+extension`).

---

### Wallet Information

#### `getAccount(): Promise<IAccount>`
Returns the full account object `{ address, publicKey }`.

#### `getWalletAddress(): Promise<string>`
Returns the currently connected wallet address.

#### `getPublicKey(): Promise<string>`
Returns the public key of the connected wallet.

#### `getNetwork(): Promise<NetworkId>`
Returns the active network: `"mainnet"` | `"testnet-10"` | `"testnet-11"`.

#### `switchNetwork(networkId: NetworkId): Promise<NetworkId>`
Requests a network switch. Returns the new active network.

#### `getBalance(): Promise<bigint>`
Returns the wallet balance in sompi as `bigint`.

#### `getUtxoEntries(): Promise<IUtxoEntriesResponse>`
Returns all unspent UTXOs for the current account (wallet native API, no RPC needed).

---

### Transactions

#### `sendKaspa(toAddress, amountSompi, options?): Promise<string>`
Builds, signs, and broadcasts a KAS transfer in one call. No RPC or WASM needed.

```typescript
const txId = await sendKaspa(
  'kaspa:qr...',
  100_000_000n,           // amount in sompi (bigint or number)
  { priorityFee: 10000n } // optional
);
```

#### `signMessage(msg: string): Promise<string>`
Signs a message with the wallet private key. Returns the hex signature.

---

### Advanced Transactions (WASM + RPC)

> These functions require WebAssembly and an active RPC connection to a Kaspa node.
> Await `wasmReady` before use.

#### `getUtxosByAddress(address: string): Promise<IUtxoEntry[]>`
Fetches UTXOs for a given address via RPC.

#### `buildTransaction(entries, outputs, payload?): string`
Builds a transaction using WASM and returns a safe-serialized JSON string.

#### `buildTransactionFromUtxos(entries, outputs, payload?): Promise<IBuildTransactionResponse>`
Builds a transaction via the wallet's native `kas:build_transaction` API.

#### `signAndBroadcastTx(networkId, txJson, scripts?): Promise<string>`
Signs and broadcasts a transaction. Opens a Kastle confirmation popup.

#### `signTx(networkId, txJson, scripts?): Promise<string>`
Signs a transaction without broadcasting. Useful for marketplace flows.

#### `sendTransaction(txJson): Promise<string>`
@deprecated — Use `signAndBroadcastTx()` instead.

#### `sendTransactionWithExtraOutputs(txJson, extraOutputs, priorityFee): Promise<string>`
Adds extra outputs to an existing transaction and broadcasts it.

---

### KRC-20 / Commit-Reveal

#### `commitReveal(networkId, namespace, data, options?): Promise<ICommitRevealResponse>`
Performs a full commit-reveal operation using the wallet's native API. Kastle handles both steps — **no WASM or RPC needed**.

```typescript
const { commitTxId, revealTxId } = await commitReveal(
  'testnet-10',
  'kasplex',
  JSON.stringify({ p: 'krc-20', op: 'mint', tick: 'TTTT' }),
  { revealPriorityFee: '100000' }
);
```

#### `doCommitReveal(script, options?): Promise<{ commitTxId?, revealTxId?, error? }>`
@deprecated — Performs commit-reveal using WASM + RPC. Prefer `commitReveal()`.

#### `commitScript(script, priorityFee?): Promise<string>`
Performs only the commit phase via WASM + RPC.

#### `revealScript(commitTxId, script, priorityFee?): Promise<string>`
Performs only the reveal phase via WASM + RPC. Polls up to 60 seconds for commit confirmation.

#### `buildRevealCommitScript(publicKeyHex, protocol, protocolAction): ScriptBuilder`
Builds a commit-reveal script for a protocol action.

#### `getCommitScriptUtxo(script, commitTxId): Promise<IUtxoEntry | undefined>`
Retrieves the UTXO associated with a commit transaction.

---

### PSKT / Script Signing

#### `signPskt(txJson, scriptOptions?): Promise<string>`
Signs a PSKT transaction using the wallet's `signTx` API. Returns the signed transaction JSON.

```typescript
import { signPskt, SignType } from '@forbole/kastle-sdk';

const signedTx = await signPskt(txJson, [
  { inputIndex: 0, script: myScript, signType: SignType.SingleAnyOneCanPay }
]);
```

**`SignType` values:** `All` | `None` | `Single` | `AllAnyOneCanPay` | `NoneAnyOneCanPay` | `SingleAnyOneCanPay`

---

### Event Listeners

#### `setEventListener(method, handler): void`
Registers a handler for SDK-level events.

```typescript
import { setEventListener } from '@forbole/kastle-sdk';

setEventListener('kas:balance_changed', (balance: bigint) => {
  console.log('New balance:', balance);
});

setEventListener('kas:account_changed', (address: string | null) => {
  console.log('Account changed:', address);
});

setEventListener('kas:network_changed', (network: string) => {
  console.log('Network changed:', network);
});
```

**Available methods:** `kas:balance_changed` | `kas:account_changed` | `kas:network_changed` | `kas:host_connected`

#### `removeEventListener(method, handler): void`
Removes a specific event listener.

#### `removeEventListeners(): void`
Removes all event listeners.

#### `on(event, handler): Promise<void>`
Registers a listener directly on the Kastle provider (raw events).

#### `removeListener(event, handler): Promise<void>`
Removes a listener from the Kastle provider.

---

### WASM Utilities

#### `wasmReady: Promise<void>`
Resolves when the Kaspa WASM module is fully loaded. Await before using WASM-dependent functions.

```typescript
import { wasmReady, kaspaWasm } from '@forbole/kastle-sdk';

await wasmReady;
const address = kaspaWasm.addressFromScriptPublicKey(...);
```

#### `kaspaWasm`
Direct access to the Kaspa WASM module exports.

---

## Types

```typescript
type NetworkId = "mainnet" | "testnet-10" | "testnet-11";

interface IAccount {
  address: string;
  publicKey: string;
}

interface ICommitRevealOptions {
  commitPriorityFee?: string; // sompi as string
  revealPriorityFee?: string;
}

interface ICommitRevealResponse {
  commitTxId: string;
  revealTxId: string;
}
```

---

## License

MIT
