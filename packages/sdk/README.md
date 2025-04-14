# @forbole/kastle-sdk

A JavaScript library for integrating Kaspa cryptocurrency wallet functionality into web applications.

[![npm version](https://img.shields.io/npm/v/@forbole/kastle-sdk.svg)](https://www.npmjs.com/package/@forbole/kastle-sdk)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

## Installation

```bash
npm install @forbole/kastle-sdk
```

## Features

- Connect to and manage Kaspa wallets
- Fetch balances and address information
- Send KAS transactions
- Handle wallet events (network changes, account changes)
- Support for multiple networks (mainnet, testnet)

## Usage

```javascript
import {
  connect,
  getWalletAddress,
  getBalance,
  sendKaspa
} from '@forbole/kastle-sdk';

// Connect to the wallet
const isConnected = await connect();

if (isConnected) {
  // Get the wallet address
  const address = await getWalletAddress();
  console.log(`Connected to address: ${address}`);
  
  // Get the wallet balance
  const balance = await getBalance();
  console.log(`Balance: ${balance} sompi`);
  
  // Send KAS to another address
  const txId = await sendKaspa('kaspa:recipient_address', 1000000);
  console.log(`Transaction sent with ID: ${txId}`);
}
```

## API Reference

### Wallet Connection

#### `isWalletInstalled()`
Checks if a compatible Kaspa wallet provider is installed.
- Returns: `boolean`

#### `connect(networkId?)`
Connects to the wallet on the specified network.
- Parameters:
    - `networkId` (optional): The network to connect to (default: 'mainnet')
- Returns: `Promise<boolean>` - True if connection was successful

#### `disconnect(origin?)`
Disconnects the wallet.
- Parameters:
    - `origin` (optional): Origin parameter
- Returns: `Promise<void>`

#### `getNetwork()`
Returns the active Kaspa network.
- Returns: `Promise<NetworkId>` ('mainnet' or 'testnet')

#### `switchNetwork(networkId)`
Switches to a different Kaspa network.
- Parameters:
    - `networkId`: The network to switch to
- Returns: `Promise<boolean>` - True if successful

### Wallet Information

#### `getWalletAddress()`
Returns the currently connected wallet address.
- Returns: `Promise<string>`

#### `getPublicKey()`
Retrieves the public key associated with the wallet.
- Returns: `Promise<string>`

#### `getBalance()`
Fetches the current balance of the wallet in sompi.
- Returns: `Promise<number>`

#### `getUtxoAddress(p2shAddress?)`
Retrieves unspent UTXOs for the wallet.
- Parameters:
    - `p2shAddress` (optional): Optional p2sh address
- Returns: `Promise<any[]>`

### Transactions

#### `sendKaspa(toAddress, amountSompi, options?)`
Sends Kaspa (KAS) to another address.
- Parameters:
    - `toAddress`: Recipient address
    - `amountSompi`: Amount to send in sompi
    - `options` (optional): Additional options like `priorityFee`
- Returns: `Promise<string>` - Transaction ID

### Event Handling

#### `setEventListeners(eventListeners)`
Registers event listeners for account/network/balance changes.
- Parameters:
    - `eventListeners`: Event listener function

#### `removeEventListeners()`
Removes all event listeners.
- Returns: `void`

## Features Under Development

The following features are currently under development and not yet fully implemented:

### ⚠️ `signPskt(txJsonString, submit?, protocol?, protocolAction?, priorityFee?)`
Signs a PSKT transaction for KRC20/KRC721 transfers.

### ⚠️ `doCommitReveal(actionScript, options?)`
Commits and reveals a transaction, used for minting/listing KRC assets.

### ⚠️ `doRevealOnly(options)`
Performs only the reveal phase of a commit-reveal operation.

### ⚠️ `signMessage(msg, type?)`
Signs a message using the wallet's private key and returns the signature.

### ⚠️ `compoundUtxo()`
Compounds wallet UTXOs.

## Requirements

- A compatible Kaspa wallet extension must be installed in the browser
- Web application with JavaScript or TypeScript support

## License

MIT