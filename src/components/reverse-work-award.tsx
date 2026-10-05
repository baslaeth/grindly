"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function ReverseWorkAward({ award }: { award: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  return <details>
    <summary>Review a credited work award</summary>
    <form className="research-form" onSubmit={async (event) => {
      event.preventDefault();
      if (busy) return;
      setBusy(true);
      setNotice("");
      const fields = new FormData(event.currentTarget);
      try {
        const response = await fetch("/api/alpha", { method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "reverseWork", award, reason: fields.get("reason"), source: fields.get("source") }) });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error?.message ?? "Reversal unavailable.");
        setNotice("Reversal recorded with the original award and evidence.");
        router.refresh();
      } catch (error) {
        setNotice(error instanceof Error ? error.message : "Reversal unavailable.");
      } finally { setBusy(false); }
    }}>
      <p>Use only for a substantiated error, fabricated evidence or copied work. A separate independent reviewer is required.</p>
      <label className="field">Reason and affected claim<textarea name="reason" minLength={20} maxLength={1500} required /></label>
      <label className="field">Supporting evidence URL<input name="source" type="url" pattern="https://.*" required /></label>
      <button className="button secondary" type="submit" disabled={busy}>{busy ? "Recording..." : "Reverse credited work XP"}</button>
      {notice && <p role="status">{notice}</p>}
    </form>
  </details>;
}
