"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Save } from "lucide-react";
import { outcomeAssessment } from "@/alpha/model";

export function OutcomeForm({ version }: { version: string }) {
  const router = useRouter();
  const [status, setStatus] = useState("inconclusive");
  const [busy, setBusy] = useState(false),
    [notice, setNotice] = useState("");
  const request = useRef<{ payload: string; id: string } | null>(null);
  const sending = useRef(false);
  return (
    <form
      className="research-form"
      onSubmit={async (e) => {
        e.preventDefault();
        if (sending.current) return;
        sending.current = true;
        setBusy(true);
        setNotice("");
        const form = e.currentTarget,
          fields = new FormData(form),
          get = (k: string) => String(fields.get(k) ?? "").trim();
        try {
          const payload = {
            action: "outcomeAssess",
            version,
            status,
            relation: get("relation"),
            facts: get("facts"),
            explanation: get("explanation"),
            uncertainty: get("uncertainty"),
            observedAt: new Date(get("observedAt") + "Z").toISOString(),
            sources: get("sources")
              .split(/\r?\n/)
              .filter(Boolean)
              .map((url, index) => ({
                url: url.trim(),
                label: new URL(url).hostname,
                publishedAt:
                  index === 0 && get("publishedAt")
                    ? new Date(get("publishedAt") + "Z").toISOString()
                    : null,
              })),
            conflicts: get("conflicts"),
            conflictFree: fields.get("conflictFree") === "on",
          };
          const serialized = JSON.stringify(payload);
          if (request.current?.payload !== serialized)
            request.current = { payload: serialized, id: crypto.randomUUID() };
          const validated = outcomeAssessment.safeParse({
            ...payload,
            request: request.current.id,
          });
          if (!validated.success)
            throw new Error(
              validated.error.issues
                .map((i) => i.message)
                .slice(0, 2)
                .join(" "),
            );
          const response = await fetch("/api/alpha", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(validated.data),
          });
          const result = await response.json();
          if (!response.ok)
            throw new Error(
              result.error?.message ??
                "Could not save. Your input is retained.",
            );
          setNotice(result.status === "Met" || result.status === "Failed" || result.status === "Cancelled"
            ? `Outcome ${result.status}. ${result.outcomeXp ?? 0} XP recorded under the saved prediction terms.`
            : "Observation saved. Prediction XP remains pending or unverified.");
          router.refresh();
        } catch (error) {
          setNotice(
            error instanceof Error ? error.message : "Could not save. Retry.",
          );
        } finally {
          sending.current = false;
          setBusy(false);
        }
      }}
    >
      <fieldset disabled={busy}>
        <label className="field">
          Observation status
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="inconclusive">Inconclusive evidence</option>
            <option value="pending">Still pending</option>
            <option value="known">Evidence allows a conclusion</option>
            <option value="mixed">Mixed evidence</option>
            <option value="cancelled">No entry trigger (complete price history required)</option>
          </select>
        </label>
        <label className="field">
          Relationship to original criteria
          <select
            key={status}
            name="relation"
            required
            defaultValue={
              status === "known" ? "" : status === "mixed" ? "mixed" : "unknown"
            }
          >
            {status === "known" ? (
              <>
                <option value="" disabled>
                  Choose from the evidence
                </option>
                <option value="met">Original criteria met</option>
                <option value="not_met">Original criteria not met</option>
              </>
            ) : (
              <option value={status === "mixed" ? "mixed" : "unknown"}>
                {status === "mixed" ? "Mixed; explain each part" : "Unknown"}
              </option>
            )}
          </select>
        </label>
        <label className="field">
          Observation date (UTC)
          <input name="observedAt" type="datetime-local" step="1" required />
        </label>
        <label className="field">
          Observed facts
          <textarea
            name="facts"
            required
            minLength={10}
            maxLength={3000}
            rows={3}
          />
        </label>
        <label className="field">
          Compare with the original claim, horizon and criteria
          <textarea
            name="explanation"
            required
            minLength={20}
            maxLength={3000}
            rows={3}
          />
        </label>
        <label className="field">
          Uncertainty and competing explanations
          <textarea
            name="uncertainty"
            required
            minLength={5}
            maxLength={1500}
            rows={2}
          />
        </label>
        <label className="field">
          Dated supporting sources (HTTPS, one per line)
          <textarea name="sources" required maxLength={4000} rows={2} />
        </label>
        <label className="field">
          First source publication date (optional, reviewer-reported UTC)
          <input name="publishedAt" type="datetime-local" />
        </label>
        <p className="muted">
          This date applies only to the first source; other publication dates
          remain unknown. Leave it empty if unknown. A current spot quote cannot
          establish all historical events. A known outcome may show that the
          original criteria were not met.
        </p>
        <label className="field">
          Conflicts and scope limits
          <input name="conflicts" required minLength={4} maxLength={500} />
        </label>
        <label className="check-field">
          <input name="conflictFree" required type="checkbox" /> I am
          independent of the author and can assess this within my assigned
          category scope.
        </label>
        <button className="button" type="submit">
          <Save size={16} />
          {busy ? "Saving..." : "Record outcome"}
        </button>
      </fieldset>
      {notice && <p role="status">{notice}</p>}
    </form>
  );
}
