import {
  connect,
  disconnect,
  setEventListener,
  removeEventListener,
} from "@forbole/kastle-sdk";
import { useState, useCallback } from "react";

export default function useConnect() {
  const [connected, setConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  const handler = useCallback(async (connected: boolean) => {
    setConnected(connected);
  }, []);

  const handleConnect = async () => {
    if (isConnecting) {
      return;
    }

    try {
      setIsConnecting(true);
      setConnected(await connect());
      setEventListener("kas:host_connected", handler);
    } catch (error) {
      console.error("Error connecting to wallet:", error);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      await disconnect();
      setConnected(false);
      removeEventListener("kas:host_connected", handler);
    } catch (error) {
      console.error("Error disconnecting from wallet:", error);
    }
  };

  return { connected, connect: handleConnect, disconnect: handleDisconnect };
}
