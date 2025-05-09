import { useState } from "react";
import useAccount from "../hooks/useAccount";
import useNetwork from "../hooks/useNetwork";
import useBalance from "../hooks/useBalance";
import useSend from "../hooks/useSend";
import CommitRevealDemo from "./CommitRevealDemo";
import SignPSKTDemo from "./SignPSKTDemo";

export default function KaspaWalletDemoDetails() {
  const { address, publicKey } = useAccount();
  const { balance, refreshBalance } = useBalance();
  const { network, switchNetwork: handleNetworkSwitch } = useNetwork();

  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [priorityFee, setPriorityFee] = useState("0");

  const { txId, sendTransaction } = useSend();

  const handleSendTransaction = async () => {
    if (!recipient || !amount) {
      return;
    }
    try {
      // Convert amount from KAS to sompi (1 KAS = 100,000,000 sompi)
      const amountSompi = Math.floor(parseFloat(amount) * 100000000);
      const priorityFeeSompi = priorityFee
        ? Math.floor(parseFloat(priorityFee) * 100000000)
        : 0;

      await sendTransaction(recipient, amountSompi, priorityFeeSompi);
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

          {txId && (
            <div className="mt-4">
              <p className="font-medium">Transaction Hash:</p>
              <p className="break-all text-sm">{txId}</p>
            </div>
          )}
        </div>

        <CommitRevealDemo />
        <SignPSKTDemo />
      </div>
    </>
  );
}
