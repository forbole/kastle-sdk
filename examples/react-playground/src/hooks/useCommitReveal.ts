import { doCommitReveal, buildRevealCommitScript } from "@forbole/kastle-sdk";

import { useState } from "react";

export default function useCommitRevealScript(
  protocol: string,
  protocolAction: string,
  publicKeyHex?: string,
  options?: {
    commitPriorityFee?: bigint;
    revealPriorityFee?: bigint;
  },
) {
  const [commitTxId, setCommitTxId] = useState<string>();
  const [revealTxId, setRevealTxId] = useState<string>();
  const [error, setError] = useState<string>();
  const [isLoading, setIsLoading] = useState(false);

  if (!publicKeyHex) {
    return {};
  }

  const script = buildRevealCommitScript(
    publicKeyHex,
    protocol,
    protocolAction,
  );

  const commitReveal = async () => {
    if (isLoading) {
      return;
    }

    try {
      setIsLoading(true);
      const { commitTxId, revealTxId, error } = await doCommitReveal(
        script,
        options,
      );
      setCommitTxId(commitTxId);
      setRevealTxId(revealTxId);
      setError(error?.message);
    } catch (err) {
      console.error("Error committing reveal:", err);
      setError(`Failed to commit reveal: ${err}`);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    commitTxId,
    revealTxId,
    error,
    commitReveal,
  };
}
