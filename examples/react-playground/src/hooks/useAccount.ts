import {
  getPublicKey,
  getWalletAddress,
  setEventListener,
  removeEventListener,
} from "@forbole/kastle-sdk";

import { useEffect, useState } from "react";

export default function useAccount() {
  const [address, setAddress] = useState<string | null>(null);
  const [publicKey, setPublicKey] = useState<string | null>(null);

  const updateAccount = async () => {
    const address = await getWalletAddress();
    const publicKey = await getPublicKey();

    setAddress(address);
    setPublicKey(publicKey);
  };

  useEffect(() => {
    updateAccount();
  }, []);

  useEffect(() => {
    const handler = async () => {
      updateAccount();
    };

    setEventListener("kas:account_changed", handler);

    return () => {
      removeEventListener("kas:account_changed", handler);
    };
  }, []);

  return { address, publicKey };
}
