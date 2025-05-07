import {
  getNetwork,
  switchNetwork,
  setEventListener,
  removeEventListener,
} from "@forbole/kastle-sdk";
import { NetworkId } from "@forbole/kastle-sdk/src/interfaces";

import { useEffect, useState } from "react";

export default function useNetwork() {
  const [network, setNetwork] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchNetwork = async () => {
      const network = await getNetwork();
      setNetwork(network);
    };

    fetchNetwork();
  }, []);

  useEffect(() => {
    const handler = async (network: string) => {
      setNetwork(network);
    };

    setEventListener("kas:network_changed", handler);

    return () => {
      removeEventListener("kas:network_changed", handler);
    };
  }, []);

  const handleSwitchNetwork = async (network: NetworkId) => {
    try {
      const currentNetwork = await getNetwork();
      if (currentNetwork === network) {
        return;
      }

      await switchNetwork(network);
      setNetwork(network);
    } catch (error) {
      console.error("Error switching network:", error);
      setError(`Failed to switch network to ${network}`);
    }
  };

  return { network, switchNetwork: handleSwitchNetwork, error };
}
