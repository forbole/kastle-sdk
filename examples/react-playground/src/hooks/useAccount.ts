import {
  getPublicKey,
  getWalletAddress,
  setEventListener,
  removeEventListener,
} from "@forbole/kastle-sdk";

import { useEffect, useState } from "react";

export default function useAccount() {
  const [address, setAddress] = useState<string>();
  const [publicKey, setPublicKey] = useState<string>();

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
    const handler = async (address: string | null) => {
      if (!address) {
        setAddress(undefined);
        setPublicKey(undefined);
        return;
      }

      updateAccount();
    };

    setEventListener("kas:account_changed", handler);

    return () => {
      removeEventListener("kas:account_changed", handler);
    };
  }, []);

  return { address, publicKey };
}
