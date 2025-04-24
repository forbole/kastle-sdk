import {
  connect,
  disconnect,
  getBalance,
  getNetwork,
  getPublicKey,
  getWalletAddress,
  isWalletInstalled,
  removeEventListeners,
  sendKaspa,
  setEventListener,
  switchNetwork,
} from "@forbole/kastle-sdk";
import React, { useEffect, useState } from "react";

const KaspaWalletDemo = () => {
  const [walletInstalled, setWalletInstalled] = useState(false);
  const [connected, setConnected] = useState(false);
  const [address, setAddress] = useState("");
  const [publicKey, setPublicKey] = useState("");
  const [network, setNetwork] = useState("");
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [priorityFee, setPriorityFee] = useState("0");
  const [txHash, setTxHash] = useState("");

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

  // Set up wallet event listeners
  useEffect(() => {
    if (connected) {
      setEventListener("kas:network_changed", (network) => setNetwork(network));
      setEventListener("kas:account_changed", () => updateWalletInfo());
      setEventListener("kas:balance_changed", (balance) => setBalance(balance));
    }

    return () => {
      if (connected) {
        removeEventListeners();
      }
    };
  }, [connected]);

  const updateWalletInfo = async () => {
    setLoading(true);
    setError("");

    try {
      const walletAddress = await getWalletAddress();
      const pubKey = await getPublicKey();
      const currentNetwork = await getNetwork();

      setAddress(walletAddress);
      setPublicKey(pubKey);
      setNetwork(currentNetwork);

      await refreshBalance();
    } catch (err) {
      console.error("Error updating wallet info:", err);
      setError("Failed to update wallet information");
    } finally {
      setLoading(false);
    }
  };

  const refreshBalance = async () => {
    try {
      const walletBalance = await getBalance();
      setBalance(walletBalance);
    } catch (err) {
      console.error("Error fetching balance:", err);
      setError("Failed to fetch wallet balance");
    }
  };

  const handleConnect = async () => {
    setLoading(true);
    setError("");

    try {
      const success = await connect();
      setConnected(success);

      if (success) {
        await updateWalletInfo();
      } else {
        setError("Wallet connection failed");
      }
    } catch (err) {
      console.error("Error connecting wallet:", err);
      setError("Failed to connect wallet");
      setConnected(false);
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    setLoading(true);
    setError("");

    try {
      await disconnect();
      setConnected(false);
      setAddress("");
      setPublicKey("");
      setNetwork("");
      setBalance(0);
    } catch (err) {
      console.error("Error disconnecting wallet:", err);
      setError("Failed to disconnect wallet");
    } finally {
      setLoading(false);
    }
  };

  const handleNetworkSwitch = async (networkId: "mainnet" | "testnet-10") => {
    setLoading(true);
    setError("");

    try {
      const success = await switchNetwork(networkId);

      if (success) {
        setNetwork(networkId);
        await refreshBalance();
      } else {
        setError(`Failed to switch to ${networkId}`);
      }
    } catch (err) {
      console.error("Error switching network:", err);
      setError("Failed to switch network");
    } finally {
      setLoading(false);
    }
  };

  const handleSendTransaction = async () => {
    if (!recipient || !amount) {
      setError("Recipient address and amount are required");
      return;
    }

    setLoading(true);
    setError("");
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
      setError("Failed to send transaction: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Format balance from sompi to KAS (1 KAS = 100,000,000 sompi)
  const formatBalance = (sompiAmount: number) => {
    return (sompiAmount / 100000000).toFixed(8);
  };

  return (
    <div className="p-6 max-w-lg mx-auto bg-white rounded-xl shadow-md">
      <h1 className="text-2xl font-bold mb-4">Kaspa Wallet Demo</h1>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

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
            disabled={loading || !walletInstalled}
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
          >
            {loading ? "Connecting..." : "Connect Wallet"}
          </button>
        ) : (
          <button
            onClick={handleDisconnect}
            disabled={loading}
            className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
          >
            {loading ? "Disconnecting..." : "Disconnect Wallet"}
          </button>
        )}
      </div>

      {connected && (
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
                  disabled={loading}
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
                disabled={loading || network === "mainnet"}
                className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
              >
                Mainnet
              </button>
              <button
                onClick={() => handleNetworkSwitch("testnet-10")}
                disabled={loading || network === "testnet"}
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
                <label className="block text-sm font-medium">
                  Amount (KAS)
                </label>
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
                disabled={loading || !recipient || !amount}
                className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
              >
                {loading ? "Sending..." : "Send KAS"}
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
      )}
    </div>
  );
};

export default KaspaWalletDemo;
