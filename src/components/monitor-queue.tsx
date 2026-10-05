"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { ResearchData } from "@/research/model";

export function MonitorQueue({ data }: { data: ResearchData }) {
  const router = useRouter();
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [targetKind, setTargetKind] = useState("opportunity");
  async function submit(payload: Record<string, unknown>) {
    setBusy(true);
    setNotice("");
    try {
      const response = await fetch("/api/alpha", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await response.json();
      if (!response.ok)
        throw new Error(
          body.error?.message ?? "Could not save monitor decision.",
        );
      setNotice("Saved.");
      router.refresh();
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : "Monitor action unavailable.",
      );
    } finally {
      setBusy(false);
    }
  }
  if (!data.launchAvailable) return null;
  return (
    <section className="section" aria-label="Opportunity monitoring">
      <h2>Opportunity monitoring</h2>
      <p>
        Only approved public documents can be checked. A changed page creates a
        verification task, not a confirmed event or member alert.
      </p>
      <details>
        <summary>Configure an approved source</summary>
        <form
          className="research-form"
          onSubmit={(event: FormEvent<HTMLFormElement>) => {
            event.preventDefault();
            const fields = new FormData(event.currentTarget);
            void submit({
              action: "monitorConfigure",
              kind: targetKind,
              opportunity: fields.get("opportunity"),
              url: fields.get("url"),
              cadenceHours: Number(fields.get("cadence")),
              enabled: fields.get("enabled") === "on",
            });
          }}
        >
          <label className="field">
            Source belongs to
            <select
              value={targetKind}
              onChange={(e) => setTargetKind(e.target.value)}
            >
              <option value="opportunity">Public opportunity</option>
              <option value="alpha">Permitted alpha</option>
            </select>
          </label>
          <label className="field">
            Record
            <select key={targetKind} name="opportunity" required>
              <option value="">Choose a record</option>
              {targetKind === "opportunity"
                ? data.operatorOpportunities?.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name}
                      {o.isDemo ? " (sample)" : ""}
                    </option>
                  ))
                : data.findings
                    .filter((f) =>
                      data.alphas?.some(
                        (a) => a.version_id === f.current_version,
                      ),
                    )
                    .map((f) => (
                      <option key={f.id} value={f.id}>
                        {
                          data.alphas?.find(
                            (a) => a.version_id === f.current_version,
                          )?.subject
                        }
                      </option>
                    ))}
            </select>
          </label>
          {targetKind === "alpha" && (
            <p>
              Use a supported official document already cited in this alpha. Its
              original version is retained; followers still need permission to
              view it.
            </p>
          )}
          <label className="field">
            Approved official document URL
            <input name="url" type="url" required placeholder="https://..." />
          </label>
          <label className="field">
            Hours between checks
            <input
              name="cadence"
              type="number"
              min={24}
              max={168}
              defaultValue={24}
              required
            />
          </label>
          <label className="check-field">
            <input name="enabled" type="checkbox" />
            Enable daily checks
          </label>
          <button className="button secondary" disabled={busy}>
            Save source
          </button>
        </form>
      </details>
      {!data.operatorOpportunities?.length && (
        <p>No public opportunity in this operator scope can be monitored.</p>
      )}
      {!!data.operatorMonitorSources?.length && (
        <details>
          <summary>
            Configured sources ({data.operatorMonitorSources.length})
          </summary>
          <ul>
            {data.operatorMonitorSources.map((source) => (
              <li key={source.id}>
                {source.enabled ? "Enabled" : "Disabled"} /{" "}
                {source.last_status.replaceAll("_", " ")} /{" "}
                {source.last_success_at
                  ? new Date(source.last_success_at).toISOString()
                  : "Never checked"}{" "}
                /{" "}
                <a href={source.url} target="_blank" rel="noreferrer">
                  source
                </a>
              </li>
            ))}
          </ul>
        </details>
      )}
      <h3>Changes awaiting verification</h3>
      {!data.monitorQueue?.length && (
        <p>No public source changes are awaiting review.</p>
      )}
      {data.monitorQueue?.map((event) => (
        <article className="watch-row" key={event.id}>
          <strong>{event.opportunityName}</strong>
          <p>
            Changed page detected {new Date(event.detected_at).toISOString()}.
            This is not yet a confirmed material event.
          </p>
          <a href={event.source_url} target="_blank" rel="noreferrer">
            Inspect official source
          </a>
          <form
            className="research-form"
            onSubmit={(formEvent: FormEvent<HTMLFormElement>) => {
              formEvent.preventDefault();
              const fields = new FormData(formEvent.currentTarget);
              void submit({
                action: "monitorConfirm",
                id: event.id,
                confirmed: fields.get("decision") === "confirm",
                change: String(fields.get("change") ?? ""),
                nextAction: String(fields.get("next") ?? ""),
                deadline: fields.get("deadline")
                  ? new Date(`${fields.get("deadline")}Z`).toISOString()
                  : null,
                priority: fields.get("priority"),
              });
            }}
          >
            <label className="field">
              Decision
              <select aria-label="Decision" name="decision">
                <option value="dismiss">Dismiss nonmaterial change</option>
                <option value="confirm">Confirm material event</option>
              </select>
            </label>
            <label className="field">
              Delivery
              <select name="priority">
                <option value="urgent">Notify now</option>
                <option value="nonurgent">Group into daily digest</option>
              </select>
            </label>
            <label className="field">
              What changed
              <input name="change" maxLength={500} />
            </label>
            <label className="field">
              Required action
              <input name="next" maxLength={500} />
            </label>
            <label className="field">
              Deadline (UTC, if any)
              <input name="deadline" type="datetime-local" />
            </label>
            <button className="button secondary" disabled={busy}>
              Record decision
            </button>
          </form>
        </article>
      ))}
      {notice && <p role="status">{notice}</p>}
    </section>
  );
}
