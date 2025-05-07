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

  useEffect(() => {
    const fetchAccount = async () => {
      const address = await getWalletAddress();
      const publicKey = await getPublicKey();

      setAddress(address);
      setPublicKey(publicKey);
    };

    fetchAccount();
  }, []);

  useEffect(() => {
    const handler = async (address?: string) => {
      if (!address) {
        return;
      }
      setAddress(address);
      setPublicKey(await getPublicKey());
    };

    setEventListener("kas:account_changed", handler);

    return () => {
      removeEventListener("kas:account_changed", handler);
    };
  }, []);

  return { address, publicKey };
}
