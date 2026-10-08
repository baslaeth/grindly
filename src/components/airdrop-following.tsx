"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, Check, Clock, AlertTriangle } from "lucide-react";
import type { ResearchData } from "@/research/model";
import { airdropAlertTypes, airdropAlertLabels } from "@/alpha/airdrop-events";
const when = (s: string | null) =>
  s
    ? new Date(s).toISOString().replace("T", " ").slice(0, 16) + " UTC"
    : "Unknown";
export function AirdropFollowing({
  data,
  operator = false,
}: {
  data: ResearchData;
  operator?: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  async function save(payload: object) {
    setBusy(true);
    setError("");
    setSaved(false);
    try {
      const r = await fetch("/api/alpha", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!r.ok) throw Error("Could not save. Your selection is retained.");
      router.refresh();
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unavailable");
    } finally {
      setBusy(false);
    }
  }
  const labels: Record<string, string> = {
    active: "Monitoring active: queued changes reviewed",
    not_checked: "Not checked",
    no_confirmed_change: "Monitoring active: no new confirmed event",
    awaiting_confirmation: "Change awaiting confirmation",
    unavailable: "Source unavailable",
    paused: "Paused",
  };
  const campaigns = Map.groupBy(data.airdropFollowing ?? [], (f) => f.campaign);
  return (
    <>
      {(data.airdropFollowing?.length ?? 0) > 0 && (
        <section
          id="airdrop-alerts"
          className="section"
          aria-label="Airdrop alerts"
        >
          <h3>
            <Bell size={18} /> Campaign monitoring
          </h3>
          <p>
            Updates from registered official pages, checked before an alert is
            sent.{" "}
            {data.monitoringSchedule === "hosted-daily"
              ? "Hosted checks run daily. Check times can vary; alerts are not immediate."
              : "Local checks need this computer and scheduler running."}
          </p>
          {[...campaigns.values()].map((follows) => {
            const f = follows[0];
            if (!f) return null;
            return (
              <article className="watch-row" key={f.campaign}>
                <strong>{f.name}</strong>
                <p className="status-label">
                  {follows.every((f) => f.paused)
                    ? "Alerts paused"
                    : (labels[f.status] ?? f.status)}
                </p>
                <p>
                  Last successful check: {when(f.lastSuccessAt)}. Next due:{" "}
                  {when(f.nextDue)}.
                </p>
                <a href={f.url} target="_blank" rel="noreferrer">
                  Official source
                </a>
                <details>
                  <summary>
                    Choose important alerts ({follows.length} followed{" "}
                    {follows.length === 1 ? "guide" : "guides"})
                  </summary>
                  <p className="muted">
                    This is source monitoring status, not proof the campaign or
                    claim is open. Due sources are picked up by the next
                    scheduled run.
                  </p>
                  {follows.map((f) => (
                    <div key={f.followId} className="follow-preferences">
                      <p>
                        <strong>
                          {data.alphas?.find(
                            (a) =>
                              a.version_id ===
                              data.findings.find(
                                (finding) =>
                                  finding.id ===
                                  data.follows?.find(
                                    (follow) => follow.id === f.followId,
                                  )?.finding_id,
                              )?.current_version,
                          )?.subject ?? "Followed guide"}
                        </strong>
                        {f.paused ? " · Paused" : ""}
                      </p>
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          const fields = new FormData(e.currentTarget);
                          void save({
                            action: "airdropPreferences",
                            follow: f.followId,
                            types: fields.getAll("types"),
                            paused: fields.get("paused") === "on",
                          });
                        }}
                      >
                        {airdropAlertTypes.map((t) => (
                          <label className="check-field" key={t}>
                            <input
                              type="checkbox"
                              name="types"
                              value={t}
                              defaultChecked={f.types.includes(t)}
                            />
                            {airdropAlertLabels[t]}
                          </label>
                        ))}
                        <label className="check-field">
                          <input
                            type="checkbox"
                            name="paused"
                            defaultChecked={f.paused}
                          />
                          Pause these alerts
                        </label>
                        <button className="button secondary" disabled={busy}>
                          Save alert preferences
                        </button>
                      </form>
                    </div>
                  ))}
                </details>
              </article>
            );
          })}
        </section>
      )}
      {(data.airdropNotifications?.length ?? 0) > 0 && (
        <section
          id="airdrop-updates"
          className="section"
          aria-label="Airdrop notifications"
        >
          <h3>Important airdrop updates</h3>
          {data.airdropNotifications?.map((n) => (
            <article className="watch-row" key={n.id}>
              {n.event.is_demo && (
                <span className="status-label">
                  Sample: historical announcement replay
                </span>
              )}
              <h4>
                {data.airdropFollowing?.find(
                  (f) => f.campaign === n.event.campaign_id,
                )?.name ?? n.event.campaign_id}
                {": "}
                {n.event.kind === "claim_open" && !n.event.observed_available_at
                  ? "Scheduled opening announcement"
                  : (airdropAlertLabels[
                      n.event.kind as keyof typeof airdropAlertLabels
                    ] ?? "Official update")}
              </h4>
              <p>
                <strong>Required action:</strong> {n.event.required_action}
              </p>
              <p>
                <Clock size={14} /> <strong>Relevant time:</strong>{" "}
                {when(n.event.scheduled_at)}. Source announcement:{" "}
                {when(n.event.announced_at)}.
              </p>
              <a href={n.event.source_url} target="_blank" rel="noreferrer">
                Official source
              </a>
              <details>
                <summary>Evidence and dated history</summary>
                <p className="muted">
                  Official announcement, confirmed by an operator. Not a
                  personal eligibility or live claim-availability check.
                </p>
                <blockquote>{n.event.passage}</blockquote>
                <p>
                  Detected {when(n.event.detected_at)}. Availability observed:{" "}
                  {when(n.event.observed_available_at)}.
                </p>
              </details>
              <p className="status-label">
                <Check size={14} aria-hidden="true" /> {n.status}
              </p>
              {n.status !== "done" && (
                <div className="form-actions">
                  {n.status === "unread" && (
                    <button
                      className="button secondary"
                      disabled={busy}
                      onClick={() =>
                        void save({
                          action: "airdropNotification",
                          id: n.id,
                          operation: "acknowledge",
                        })
                      }
                    >
                      Acknowledge
                    </button>
                  )}
                  <button
                    className="button secondary"
                    disabled={busy}
                    onClick={() =>
                      void save({
                        action: "airdropNotification",
                        id: n.id,
                        operation: "done",
                      })
                    }
                  >
                    <Check size={16} />
                    Done
                  </button>
                </div>
              )}
            </article>
          ))}
        </section>
      )}
      {operator && (data.airdropQueue?.length ?? 0) > 0 && (
        <section className="section">
          <h3>
            <AlertTriangle size={18} /> Airdrop event confirmation
          </h3>
          {data.airdropQueue?.map((e) => (
            <article className="watch-row" key={e.id}>
              <strong>
                {e.campaign_id} / {e.kind}
              </strong>
              {e.is_demo && (
                <p>Sample historical replay. Never sent to genuine members.</p>
              )}
              <blockquote>{e.passage}</blockquote>
              <p>
                Announcement {when(e.announced_at)}. Scheduled{" "}
                {when(e.scheduled_at)}. Observed availability{" "}
                {when(e.observed_available_at)}.
              </p>
              <a href={e.source_url} target="_blank" rel="noreferrer">
                Inspect official source
              </a>
              <p>
                Confirm only the quoted announcement, not individual eligibility
                or current availability.
              </p>
              <div className="form-actions">
                <button
                  className="button"
                  disabled={busy}
                  onClick={() =>
                    void save({
                      action: "airdropConfirm",
                      event: e.id,
                      confirm: true,
                    })
                  }
                >
                  Confirm sourced announcement
                </button>
                <button
                  className="button secondary"
                  disabled={busy}
                  onClick={() =>
                    void save({
                      action: "airdropConfirm",
                      event: e.id,
                      confirm: false,
                    })
                  }
                >
                  Dismiss
                </button>
              </div>
            </article>
          ))}
        </section>
      )}
      {error && <p role="alert">{error}</p>}
      {saved && (
        <p className="success-notice" role="status">
          Saved.
        </p>
      )}
    </>
  );
}
