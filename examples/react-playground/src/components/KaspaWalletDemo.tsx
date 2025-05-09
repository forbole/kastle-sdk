import { isWalletInstalled } from "@forbole/kastle-sdk";
import React, { useEffect, useState } from "react";
import useConnect from "../hooks/useConnect";
import DemoDetails from "./DemoDetails";

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

      checkTime++;
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

      {connected && <DemoDetails />}
    </div>
  );
};

export default KaspaWalletDemo;
