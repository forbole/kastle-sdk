import {
  signPskt,
  buildTransaction,
  getUtxosByAddress,
  kaspaWasm,
  SignType,
  sendTransactionWithExtraOutputs,
} from "@forbole/kastle-sdk";
import React, { useState } from "react";

import useAccount from "../hooks/useAccount";

export default function SignPSKTDemo() {
  const [pskt, setPskt] = useState<string>("");
  const [txId, setTxId] = useState<string>("");
  const { address } = useAccount();

  const handleSign = async () => {
    if (!address) {
      return;
    }

    try {
      const utxos = [(await getUtxosByAddress(address)).pop()!];

      const transaction = buildTransaction(utxos, [
        {
          address: address,
          amount: kaspaWasm.kaspaToSompi("0.2")!,
        },
      ]);

      const scriptOptions = utxos.map((_, index) => {
        return {
          inputIndex: index,
          signType: SignType.NoneAnyOneCanPay,
        };
      });

      const pskt = await signPskt(transaction, scriptOptions);
      setPskt(pskt);
    } catch (error) {
      console.error("Error signing PSKT:", error);
    }
  };

  const handleSendPskt = async () => {
    if (!pskt || !address) {
      return;
    }
    const utxos = (await getUtxosByAddress(address)).pop()!;

    try {
      const txId = await sendTransactionWithExtraOutputs(
        pskt,
        [],
        kaspaWasm.kaspaToSompi("0.01")!,
      );
      setTxId(txId);
    } catch (error) {
      console.error("Error sending PSKT:", error);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-2xl font-bold">Sign PSKT Demo</h2>

      <div>
        <textarea
          className="border rounded p-2 h-32 resize-none"
          value={pskt ? JSON.stringify(JSON.parse(pskt), null, 2) : ""}
          onChange={(e) => setPskt(e.target.value)}
          placeholder="PSKT will appear here..."
          style={{
            width: "30%",
          }}
          rows={10}
        ></textarea>
      </div>

      <div>
        <button
          onClick={handleSign}
          className="bg-blue-500 text-white px-4 py-2 rounded"
        >
          Sign PSKT
        </button>
      </div>

      <div>
        <button
          onClick={handleSendPskt}
          className="bg-green-500 text-white px-4 py-2 rounded"
        >
          Send PSKT
        </button>
        {txId && <p>Transaction ID: {txId}</p>}
      </div>
    </div>
  );
}
