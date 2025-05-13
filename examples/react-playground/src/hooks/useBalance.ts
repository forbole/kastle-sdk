import {
  getBalance,
  setEventListener,
  removeEventListener,
} from "@forbole/kastle-sdk";
import { useEffect, useState } from "react";

export default function useBalance() {
  const [balance, setBalance] = useState(BigInt(0));
  const [error, setError] = useState<string | null>(null);

  const refreshBalance = async () => {
    try {
      const walletBalance = await getBalance();
      setBalance(walletBalance);
    } catch (err) {
      console.error("Error fetching balance:", err);
      setError("Failed to fetch wallet balance");
    }
  };

  useEffect(() => {
    refreshBalance();
  }, []);

  useEffect(() => {
    const handler = async (balance: bigint) => {
      setBalance(balance);
    };

    setEventListener("kas:balance_changed", handler);

    return () => {
      removeEventListener("kas:balance_changed", handler);
    };
  }, []);

  return { balance, refreshBalance, error };
}
