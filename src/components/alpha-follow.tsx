"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Bookmark, Check } from "lucide-react";

export function AlphaFollow({
  finding,
  deadline,
  followed,
  participated,
}: {
  finding: string;
  deadline: string | null;
  followed: boolean;
  participated: boolean;
}) {
  const router = useRouter();
  const [watching, setWatching] = useState(followed);
  const [done, setDone] = useState(participated);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function save(
    operation: "follow" | "remove" | "participated",
    note = "",
    nextAction = "",
  ) {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/alpha", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "follow",
          kind: "alpha",
          id: finding,
          operation,
          note,
          nextAction,
          deadline,
        }),
      });
      const body = await response.json();
      if (!response.ok)
        throw new Error(body.error?.message ?? "Could not update watchlist.");
      setWatching(operation !== "remove");
      if (operation === "participated") setDone(true);
      router.refresh();
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Watchlist unavailable.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="form-actions" aria-busy={busy}>
      <button
        className="button secondary"
        type="button"
        disabled={busy}
        onClick={() => void save(watching ? "remove" : "follow")}
      >
        <Bookmark size={16} />
        {busy ? "Saving..." : watching ? "Following" : "Follow"}
      </button>
      <details>
        <summary>I participated</summary>
        <form
          onSubmit={(event: FormEvent<HTMLFormElement>) => {
            event.preventDefault();
            const fields = new FormData(event.currentTarget);
            void save(
              "participated",
              String(fields.get("note") ?? ""),
              String(fields.get("next") ?? ""),
            );
          }}
        >
          <p>
            This is your own participation note, not an eligibility approval or
            verified application.
          </p>
          <label className="field">
            What you did (optional)
            <input name="note" maxLength={500} />
          </label>
          <label className="field">
            Next action (optional)
            <input name="next" maxLength={500} />
          </label>
          <button className="button secondary" type="submit" disabled={busy}>
            <Check size={16} />
            {done ? "Update participation" : "Save participation"}
          </button>
        </form>
      </details>
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
