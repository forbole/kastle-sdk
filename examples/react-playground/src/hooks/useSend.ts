import { sendKaspa } from "@forbole/kastle-sdk";
import { useState } from "react";

export default function useSend() {
  const [txId, setTxId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);

  const sendTransaction = async (
    address: string,
    amount: number,
    priorityFee?: number,
  ) => {
    try {
      if (isSending) {
        return;
      }

      setIsSending(true);
      const transactionId = await sendKaspa(address, amount, {
        priorityFee: priorityFee,
      });
      setTxId(transactionId);
    } catch (err) {
      console.error("Error sending transaction:", err);
      setError("Failed to send transaction");
    } finally {
      setIsSending(false);
    }
  };

  return { txId, error, sendTransaction };
}
