"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Bell } from "lucide-react";
import type { ResearchData } from "@/research/model";
import { AirdropFollowing } from "./airdrop-following";

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
  const [saved, setSaved] = useState("");
  const [reminders, setReminders] = useState(
    data.watchPreferences?.reminders ?? true,
  );
  const [digest, setDigest] = useState(
    data.watchPreferences?.nonurgent_digest ?? true,
  );
  async function mutate(payload: Record<string, unknown>, id: string) {
    setBusy(id);
    setNotice("");
    setSaved("");
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
      setSaved(id === "preferences" ? "Preferences saved." : "Update saved.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not save.");
    } finally {
      setBusy(null);
    }
  }
  if (!data.launchAvailable)
    return (
      <p role="status">
        Following is temporarily unavailable. Your saved alphas are still in
        your profile.
      </p>
    );
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
    <section className="section" aria-label="Your watchlist" id="following">
      <div className="section-heading">
        <h2>Your followed alphas</h2>
        <Bell size={18} aria-hidden="true" />
      </div>
      {!!data.airdropFollowing?.length && (
        <nav
          className="form-actions following-shortcuts"
          aria-label="Following sections"
        >
          <a className="inline-link" href="#airdrop-alerts">
            Monitoring
          </a>
          {!!data.airdropNotifications?.length && (
            <a className="inline-link" href="#airdrop-updates">
              Important updates
            </a>
          )}
        </nav>
      )}
      {!data.follows?.length && (
        <p className="empty-state">
          Nothing followed yet. <Link href="/workbench">Browse alphas</Link> to
          find one worth following.
        </p>
      )}
      {data.follows?.map((follow) => {
        const campaign = data.airdropFollowing?.find(
          (c) => c.followId === follow.id,
        );
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
        const campaignLatest = data.airdropNotifications
          ?.filter((n) => n.event.campaign_id === campaign?.campaign)
          .sort((a, b) =>
            b.event.detected_at.localeCompare(a.event.detected_at),
          )[0];
        const confirmedLatest =
          coverage?.status === "change_queued" &&
          latest &&
          coverage.lastSuccessAt &&
          Date.parse(latest.created_at) >= Date.parse(coverage.lastSuccessAt);
        return (
          <article className="watch-row" key={follow.id}>
            <h3>
              {finding ? (
                <Link href={`/findings/${finding.id}`}>
                  {data.alphas?.find(
                    (a) => a.version_id === finding.current_version,
                  )?.subject ??
                    claim ??
                    "Alpha"}
                </Link>
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
            <p>
              Latest material change:{" "}
              {campaignLatest ? (
                <a className="inline-link" href="#airdrop-updates">
                  {campaignLatest.event.is_demo
                    ? "Sample announcement replay"
                    : "Confirmed campaign update"}{" "}
                  · {when(campaignLatest.event.detected_at)}
                </a>
              ) : (
                (latest?.detail ?? "None confirmed.")
              )}
            </p>
            {!campaign && (
              <p>
                Source coverage:{" "}
                {confirmedLatest
                  ? "Latest detected change confirmed"
                  : coverage
                    ? (coverageLabel[coverage.status] ?? "Unknown")
                    : "Not configured"}
                . Last successful check:{" "}
                {coverage?.lastSuccessAt
                  ? when(coverage.lastSuccessAt)
                  : "None"}
                .
              </p>
            )}
          </article>
        );
      })}
      <AirdropFollowing data={data} />
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
      {saved && (
        <p className="success-notice" role="status">
          {saved}
        </p>
      )}
    </section>
  );
}
