"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";

export function AlphaFeedback({
  version,
  appeal = false,
}: {
  version: string;
  appeal?: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const request = useRef<{ payload: string; id: string } | null>(null);
  return (
    <form
      className="research-form"
      onSubmit={async (e) => {
        e.preventDefault();
        if (busy) return;
        setBusy(true);
        setNotice("");
        const form = e.currentTarget;
        const f = new FormData(form);
        try {
          const payload = appeal
            ? { action: "appeal", version, reason: f.get("detail") }
            : {
                action: "feedback",
                version,
                kind: f.get("kind"),
                detail: f.get("detail"),
                source: f.get("source"),
              };
          const serialized = JSON.stringify(payload);
          if (request.current?.payload !== serialized)
            request.current = { payload: serialized, id: crypto.randomUUID() };
          const r = await fetch("/api/alpha", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(
              appeal ? payload : { ...payload, request: request.current.id },
            ),
          });
          const result = await r.json();
          if (!r.ok)
            throw new Error(
              result.error?.message ?? "Could not save feedback.",
            );
          form.reset();
          request.current = null;
          setNotice("Recorded. This does not approve work or award XP.");
          router.refresh();
        } catch (err) {
          setNotice(err instanceof Error ? err.message : "Unavailable. Retry.");
        } finally {
          setBusy(false);
        }
      }}
    >
      <fieldset disabled={busy}>
        {!appeal && (
          <label className="field">
            Feedback type
            <select aria-label="Feedback type" name="kind">
              <option value="correction">Sourced correction</option>
              <option value="challenge">Challenge</option>
              <option value="useful">Useful to my work</option>
            </select>
          </label>
        )}
        <label className="field">
          {appeal ? "Reason for independent appeal" : "Evidence and feedback"}
          <textarea name="detail" required minLength={10} maxLength={1500} />
        </label>
        {!appeal && (
          <label className="field">
            Supporting source
            <input
              name="source"
              type="url"
              required
              pattern="https://.*"
              maxLength={500}
            />
          </label>
        )}
        <button className="button" type="submit">
          {appeal ? "Request independent review" : "Send sourced feedback"}
        </button>
      </fieldset>
      {notice && <p role="status">{notice}</p>}
    </form>
  );
}

export function AlphaAction({
  version,
  action,
  label,
}: {
  version: string;
  action: "preliminary" | "refreshSources" | "outcomeCheck" | "localReview";
  label: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  return (
    <div>
      <button
        className="button secondary"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setNotice("");
          try {
            const r = await fetch("/api/alpha", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ action, version }),
            });
            const result = await r.json();
            if (!r.ok)
              throw new Error(
                result.error?.message ??
                  "This check is unavailable. Retry later.",
              );
            setNotice(
              result.message ??
                "Check requested. Refresh to see the saved result.",
            );
            router.refresh();
          } catch (e) {
            setNotice(e instanceof Error ? e.message : "Check unavailable.");
          } finally {
            setBusy(false);
          }
        }}
      >
        <RefreshCw size={16} />
        {busy ? "Requesting..." : label}
      </button>
      {notice && <p role="status">{notice}</p>}
    </div>
  );
}
