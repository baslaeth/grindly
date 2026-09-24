"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { BadgePlus, Link2 } from "lucide-react";

export function MembershipActions() {
  const [tokenId, setTokenId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [tx, setTx] = useState<string | null>(null);
  const router = useRouter();
  async function submit(kind: "mint" | "bind") {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch(`/api/membership/${kind}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(kind === "bind" ? { tokenId } : {}),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error?.message ?? "Membership request failed.");
      setTx(data.transactionHash ?? null);
      if (data.status === "pending")
        setMessage("Mint pending. Check mint status again shortly.");
      else if (data.status === "reverted")
        setError("Mint reverted. No membership access granted.");
      else {
        setMessage("Membership bound.");
        router.refresh();
      }
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Membership request failed.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="account-state">
      <div className="form-actions">
        <button
          className="button"
          disabled={busy}
          onClick={() => submit("mint")}
        >
          <BadgePlus size={16} aria-hidden="true" />
          {busy ? "Processing..." : "Mint / check status"}
        </button>
      </div>
      <form
        className="join-form"
        onSubmit={(event) => {
          event.preventDefault();
          submit("bind");
        }}
      >
        <label className="field">
          Existing token ID
          <input
            value={tokenId}
            onChange={(event) => setTokenId(event.target.value)}
            inputMode="numeric"
            pattern="[1-9][0-9]*"
            required
            disabled={busy}
          />
        </label>
        <button className="button secondary" disabled={busy}>
          <Link2 size={16} aria-hidden="true" />
          Bind token
        </button>
      </form>
      {message && (
        <p className="form-message" role="status">
          {message}
        </p>
      )}
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {tx && (
        <a
          href={`https://explorer.testnet.chain.robinhood.com/tx/${tx}`}
          target="_blank"
          rel="noreferrer"
        >
          Mint transaction
        </a>
      )}
    </div>
  );
}
