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
  async function save(payload: object) {
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/alpha", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!r.ok) throw Error("Could not save. Your selection is retained.");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unavailable");
    } finally {
      setBusy(false);
    }
  }
  const labels: Record<string, string> = {
    active: "Active: queued changes reviewed",
    not_checked: "Not checked",
    no_confirmed_change: "Active: no new confirmed event",
    awaiting_confirmation: "Change awaiting confirmation",
    unavailable: "Source unavailable",
    paused: "Paused",
  };
  return (
    <>
      {(data.airdropFollowing?.length ?? 0) > 0 && (
        <section
          id="airdrop-alerts"
          className="section"
          aria-label="Airdrop alerts"
        >
          <h3>
            <Bell size={18} /> Airdrop alerts
          </h3>
          <p>
            Official-page checks only. Historical programs are not currently
            open. Local checks need this computer and scheduler running.
          </p>
          {data.airdropFollowing?.map((f) => (
            <article className="watch-row" key={f.followId}>
              <strong>{f.name}</strong>
              <p>{labels[f.status] ?? f.status}</p>
              <p>
                Last successful check: {when(f.lastSuccessAt)}. Next check:{" "}
                {when(f.nextDue)}.
              </p>
              <a href={f.url} target="_blank" rel="noreferrer">
                Official source
              </a>
              <details>
                <summary>Choose important alerts</summary>
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
              </details>
            </article>
          ))}
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
                {airdropAlertLabels[
                  n.event.kind as keyof typeof airdropAlertLabels
                ] ?? "Official update"}
              </h4>
              <p>
                <strong>What happened:</strong>{" "}
                {n.event.passage.length > 240
                  ? `${n.event.passage.slice(0, 240)}...`
                  : n.event.passage}
              </p>
              <p className="muted">
                Official announcement, confirmed by an operator. Not a personal
                eligibility or live claim-availability check.
              </p>
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
                <blockquote>{n.event.passage}</blockquote>
                <p>
                  Detected {when(n.event.detected_at)}. Availability observed:{" "}
                  {when(n.event.observed_available_at)}.
                </p>
              </details>
              <p>{n.status}</p>
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
    </>
  );
}
