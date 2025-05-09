import useCommitReveal from "../hooks/useCommitReveal";
import useAccount from "../hooks/useAccount";

export default function CommitRevealDemo() {
  const { address, publicKey } = useAccount();
  const { commitTxId, revealTxId, commitReveal, error } = useCommitReveal(
    "kasplex",
    JSON.stringify({
      p: "krc-20",
      op: "transfer",
      tick: "TTTT",
      amt: "10000",
      to: address,
    }),
    publicKey,
    {
      revealPriorityFee: BigInt(100000),
    },
  );

  const handleCommitReveal = async () => {
    if (!address || !publicKey || !commitReveal) {
      return;
    }
    try {
      await commitReveal();
    } catch (err) {
      console.error("Error committing reveal:", err);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-2xl font-bold">Commit Reveal Demo</h2>
      <button
        onClick={handleCommitReveal}
        className="bg-blue-500 text-white px-4 py-2 rounded"
      >
        Commit Reveal
      </button>
      {commitTxId && <p>Commit Transaction ID: {commitTxId}</p>}
      {revealTxId && <p>Reveal Transaction ID: {revealTxId}</p>}
      {error && <p className="text-red-500">{error}</p>}
    </div>
  );
}
