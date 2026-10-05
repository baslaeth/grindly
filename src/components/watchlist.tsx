"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Bell } from "lucide-react";
import type { ResearchData } from "@/research/model";

const when = (value: string) =>
  new Date(value).toISOString().replace("T", " ").slice(0, 16) + " UTC";
const coverageLabel: Record<string, string> = {
  not_checked: "Not checked",
  no_new_confirmed_event: "No new confirmed event",
  source_unavailable: "Source unavailable",
  change_queued: "Change awaiting operator verification",
};
export function Watchlist({ data }: { data: ResearchData }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [reminders, setReminders] = useState(
    data.watchPreferences?.reminders ?? true,
  );
  const [digest, setDigest] = useState(
    data.watchPreferences?.nonurgent_digest ?? true,
  );
  async function mutate(payload: Record<string, unknown>, id: string) {
    setBusy(id);
    setNotice("");
    try {
      const response = await fetch("/api/alpha", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await response.json();
      if (!response.ok)
        throw new Error(body.error?.message ?? "Could not save.");
      router.refresh();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not save.");
    } finally {
      setBusy(null);
    }
  }
  if (!data.launchAvailable) return null;
  type Notification = NonNullable<ResearchData["notifications"]>[number];
  const groups: { key: string; batch: string | null; items: Notification[] }[] =
    [];
  for (const notification of data.notifications ?? []) {
    const key = notification.batch_at ?? notification.id;
    let group = groups.find((item) => item.key === key);
    if (!group) {
      group = { key, batch: notification.batch_at, items: [] };
      groups.push(group);
    }
    group.items.push(notification);
  }
  const renderNotification = (notification: Notification) => {
    const follow = data.follows?.find((f) => f.id === notification.follow_id);
    const href = follow?.finding_id
      ? `/findings/${follow.finding_id}`
      : follow?.opportunity_id
        ? `/${data.profiles.find((p) => p.member_id === data.memberId)?.is_demo ? "?sample=1" : ""}#opportunity-${follow.opportunity_id}`
        : null;
    return (
      <article className="watch-row" key={notification.id}>
        <strong>
          {href ? (
            <Link href={href}>{notification.title}</Link>
          ) : (
            notification.title
          )}
        </strong>
        <span className="status-label">{notification.status}</span>
        <p>{notification.detail}</p>
        <p>
          {when(notification.created_at)}
          {notification.sourceDate
            ? ` / Source ${when(notification.sourceDate)}`
            : ""}
        </p>
        {notification.sourceUrl && (
          <a href={notification.sourceUrl} target="_blank" rel="noreferrer">
            Official source
          </a>
        )}
        {notification.status !== "done" && (
          <div className="form-actions">
            {notification.status === "unread" && (
              <button
                className="button secondary"
                disabled={busy === notification.id}
                onClick={() =>
                  void mutate(
                    {
                      action: "notification",
                      id: notification.id,
                      operation: "acknowledge",
                    },
                    notification.id,
                  )
                }
              >
                Acknowledge
              </button>
            )}
            <button
              className="button secondary"
              disabled={busy === notification.id}
              onClick={() =>
                void mutate(
                  {
                    action: "notification",
                    id: notification.id,
                    operation: "done",
                  },
                  notification.id,
                )
              }
            >
              <Check size={16} />
              Done
            </button>
          </div>
        )}
      </article>
    );
  };
  return (
    <section className="section" aria-label="Your watchlist">
      <div className="section-heading">
        <h2>Following</h2>
        <Bell size={18} aria-hidden="true" />
      </div>
      {!data.follows?.length && <p>No opportunities or alpha followed yet.</p>}
      {data.follows?.map((follow) => {
        const finding = data.findings.find((f) => f.id === follow.finding_id);
        const claim = data.versions.find(
          (v) => v.id === finding?.current_version,
        )?.claim;
        const coverage = data.watchCoverage?.find((c) =>
          follow.finding_id
            ? c.finding === follow.finding_id
            : c.opportunity === follow.opportunity_id,
        );
        const latest = data.notifications?.find(
          (n) => n.follow_id === follow.id && n.kind === "material_change",
        );
        const confirmedLatest =
          coverage?.status === "change_queued" &&
          latest &&
          coverage.lastSuccessAt &&
          Date.parse(latest.created_at) >= Date.parse(coverage.lastSuccessAt);
        return (
          <article className="watch-row" key={follow.id}>
            <h3>
              {finding ? (
                <Link href={`/findings/${finding.id}`}>{claim ?? "Alpha"}</Link>
              ) : (
                <Link
                  href={`/${data.profiles.find((p) => p.member_id === data.memberId)?.is_demo ? "?sample=1" : ""}#opportunity-${follow.opportunity_id}`}
                >
                  {follow.opportunityName ?? "Followed opportunity"}
                </Link>
              )}
            </h3>
            <p>
              {follow.participated ? "Participation recorded" : "Following"}
              {follow.note ? ` / ${follow.note}` : ""}
            </p>
            <p>
              Next:{" "}
              {follow.next_action || "Check the official source before acting."}
              {follow.deadline
                ? ` Deadline ${when(follow.deadline)}.`
                : " No deadline recorded."}
            </p>
            <p>Latest material change: {latest?.detail ?? "None confirmed."}</p>
            <p>
              Source coverage:{" "}
              {confirmedLatest
                ? "Latest detected change confirmed"
                : coverage
                  ? (coverageLabel[coverage.status] ?? "Unknown")
                  : "Not configured"}
              . Last successful check:{" "}
              {coverage?.lastSuccessAt ? when(coverage.lastSuccessAt) : "None"}.
            </p>
          </article>
        );
      })}
      {!!groups.length && (
        <div className="watch-notifications">
          <h3>Notifications</h3>
          {groups.map((group) =>
            group.batch ? (
              <details key={group.key}>
                <summary>
                  Daily update digest ({group.items.length}) /{" "}
                  {when(group.batch)}
                </summary>
                {group.items.map(renderNotification)}
              </details>
            ) : (
              group.items.map(renderNotification)
            ),
          )}
        </div>
      )}
      <details>
        <summary>Reminder preferences</summary>
        <div className="form-actions">
          <label className="check-field">
            <input
              type="checkbox"
              checked={reminders}
              onChange={(e) => setReminders(e.target.checked)}
            />
            Deadline reminders
          </label>
          <label className="check-field">
            <input
              type="checkbox"
              checked={digest}
              onChange={(e) => setDigest(e.target.checked)}
            />
            Group nonurgent updates
          </label>
          <button
            className="button secondary"
            disabled={busy === "preferences"}
            onClick={() =>
              void mutate(
                { action: "watchPreferences", reminders, digest },
                "preferences",
              )
            }
          >
            Save preferences
          </button>
        </div>
      </details>
      {notice && <p role="alert">{notice}</p>}
    </section>
  );
}
