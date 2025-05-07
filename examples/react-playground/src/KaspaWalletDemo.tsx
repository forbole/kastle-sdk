import {
  isWalletInstalled,
  sendKaspa,
} from "@forbole/kastle-sdk";
import React, { useEffect, useState } from "react";
import useAccount from "./hooks/useAccount";
import useNetwork from "./hooks/useNetwork";
import useBalance from "./hooks/useBalance";
import useConnect from "./hooks/useConnect";

const KaspaWalletDemoDetails = () => {
  const { address, publicKey } = useAccount();
  const { balance, refreshBalance } = useBalance();
  const { network, switchNetwork: handleNetworkSwitch } = useNetwork();

  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [priorityFee, setPriorityFee] = useState("0");
  const [txHash, setTxHash] = useState("");

  const handleSendTransaction = async () => {
    if (!recipient || !amount) {
      return;
    }
    setTxHash("");
    try {
      // Convert amount from KAS to sompi (1 KAS = 100,000,000 sompi)
      const amountSompi = Math.floor(parseFloat(amount) * 100000000);
      const priorityFeeSompi = priorityFee
        ? Math.floor(parseFloat(priorityFee) * 100000000)
        : 0;

      const transactionHash = await sendKaspa(recipient, amountSompi, {
        priorityFee: priorityFeeSompi,
      });

      setTxHash(transactionHash);
      await refreshBalance();
    } catch (err: any) {
      console.error("Error sending transaction:", err);
    }
  };

  // Format balance from sompi to KAS (1 KAS = 100,000,000 sompi)
  const formatBalance = (sompiAmount: number) => {
    return (sompiAmount / 100000000).toFixed(8);
  };

  return (
    <>
      {/* Wallet Info */}
      <div className="mb-6 p-4 border rounded">
        <h2 className="text-xl font-semibold mb-2">Wallet Information</h2>
        <div className="grid grid-cols-1 gap-2">
          <div>
            <p className="font-medium">Network:</p>
            <p className="break-all">{network}</p>
          </div>
          <div>
            <p className="font-medium">Address:</p>
            <p className="break-all text-sm">{address}</p>
          </div>
          <div>
            <p className="font-medium">Public Key:</p>
            <p className="break-all text-sm">{publicKey}</p>
          </div>
          <div>
            <p className="font-medium">Balance:</p>
            <p>{formatBalance(balance)} KAS</p>
            <button
              onClick={refreshBalance}
              className="text-blue-500 text-sm underline"
            >
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Network Switching */}
      <div className="mb-6 p-4 border rounded">
        <h2 className="text-xl font-semibold mb-2">Switch Network</h2>
        <div className="flex space-x-2">
          <button
            onClick={() => handleNetworkSwitch("mainnet")}
            disabled={network === "mainnet"}
            className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
          >
            Mainnet
          </button>
          <button
            onClick={() => handleNetworkSwitch("testnet-10")}
            disabled={network === "testnet-10"}
            className="bg-purple-500 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
          >
            Testnet
          </button>
        </div>
      </div>

      {/* Send Transaction */}
      <div className="p-4 border rounded">
        <h2 className="text-xl font-semibold mb-4">Send KAS</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium">
              Recipient Address
            </label>
            <input
              type="text"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              className="mt-1 p-2 w-full border rounded"
              placeholder="Enter recipient address"
            />
          </div>

          <div>
            <label className="block text-sm font-medium">Amount (KAS)</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              step="0.00000001"
              min="0"
              className="mt-1 p-2 w-full border rounded"
              placeholder="0.00000000"
            />
          </div>

          <div>
            <label className="block text-sm font-medium">
              Priority Fee (KAS, optional)
            </label>
            <input
              type="number"
              value={priorityFee}
              onChange={(e) => setPriorityFee(e.target.value)}
              step="0.00000001"
              min="0"
              className="mt-1 p-2 w-full border rounded"
              placeholder="0.00000000"
            />
          </div>

          <button
            onClick={handleSendTransaction}
            disabled={!recipient || !amount}
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
          >
            Send KAS
          </button>

          {txHash && (
            <div className="mt-4">
              <p className="font-medium">Transaction Hash:</p>
              <p className="break-all text-sm">{txHash}</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

const KaspaWalletDemo = () => {
  const [walletInstalled, setWalletInstalled] = useState(false);
  const {
    connected,
    connect: handleConnect,
    disconnect: handleDisconnect,
  } = useConnect();

  // Check if wallet is installed on mount
  useEffect(() => {
    const checkWalletInstallation = () => {
      try {
        const installed = isWalletInstalled();
        setWalletInstalled(installed);
        return installed;
      } catch (error) {
        return false;
      }
    };

    if (walletInstalled) return;

    // Set up polling if not loaded yet
    let checkTime = 0;
    const intervalId = setInterval(() => {
      if (checkTime > 10) {
        clearInterval(intervalId);
        return;
      }

      if (checkWalletInstallation()) {
        clearInterval(intervalId);
      }
    }, 200); // Check every 200ms

    // Clean up interval on component unmount
    return () => clearInterval(intervalId);
  }, []);

  return (
    <div className="p-6 max-w-lg mx-auto bg-white rounded-xl shadow-md">
      <h1 className="text-2xl font-bold mb-4">Kaspa Wallet Demo</h1>

      {/* Wallet Installation Status */}
      <div className="mb-4">
        <p className="font-semibold">Wallet Status:</p>
        <p>{walletInstalled ? "Installed ✓" : "Not Installed ✗"}</p>
      </div>

      {/* Connect/Disconnect Buttons */}
      <div className="mb-6">
        {!connected ? (
          <button
            onClick={handleConnect}
            disabled={!walletInstalled}
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
          >
            Connect Wallet
          </button>
        ) : (
          <button
            onClick={handleDisconnect}
            className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
          >
            Disconnect Wallet
          </button>
        )}
      </div>

      {connected && <KaspaWalletDemoDetails />}
    </div>
  );
};

export default KaspaWalletDemo;
