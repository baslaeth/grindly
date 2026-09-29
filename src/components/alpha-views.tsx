import Link from "next/link";
import {
  categoryRecord,
  contributionTypes,
  type CheckedSource,
} from "@/alpha/model";
import { type ResearchData, person } from "@/research/model";
import { AlphaAction, AlphaFeedback } from "./alpha-actions";

const time = (s: string) =>
  new Date(s).toISOString().replace("T", " ").slice(0, 19) + " UTC";
function Source({ source: s }: { source: CheckedSource }) {
  return (
    <li>
      {s.url ? (
        <a href={s.url} target="_blank" rel="noreferrer">
          {s.label}
        </a>
      ) : (
        s.label
      )}{" "}
      <span className="muted">
        {s.status === "unknown" ? "Unknown. " : ""}Checked {time(s.checkedAt)}
        {s.publishedAt
          ? `; source timestamp ${time(s.publishedAt)}`
          : "; publication time unknown"}
      </span>
      <details>
        <summary>Observed source and limitations</summary>
        <p className="source-facts">{s.facts}</p>
        {s.digest && <p className="muted">Snapshot SHA-256: {s.digest}</p>}
      </details>
    </li>
  );
}
export function AlphaDetails({
  data,
  version,
}: {
  data: ResearchData;
  version: string;
}) {
  const a = data.alphas?.find((v) => v.version_id === version);
  if (!a) return null;
  const v = data.versions.find((v) => v.id === version);
  const f = data.findings.find((f) => f.id === v?.finding_id);
  const runs =
    data.preliminary
      ?.filter((r) => r.version_id === version)
      .sort((a, b) => b.created_at.localeCompare(a.created_at)) ?? [];
  const run = runs.find((r) => r.status === "complete") ?? runs[0];
  const canRetry =
    f?.author_id === data.memberId ||
    data.assignments.some(
      (r) =>
        r.version_id === version &&
        r.reviewer_id === data.memberId &&
        !r.completed_at,
    );
  const outcomes =
    data.outcomes
      ?.filter((o) => o.version_id === version)
      .sort((a, b) => b.checked_at.localeCompare(a.checked_at)) ?? [];
  return (
    <div className="alpha-detail">
      <p>
        <strong>{a.category}</strong> / {contributionTypes[a.contribution_type]}
      </p>
      <p>{a.purpose}</p>
      <dl className="record-context">
        <div>
          <dt>Server submission time</dt>
          <dd>{time(a.created_at)}</dd>
        </div>
        <div>
          <dt>First noticed, self-reported</dt>
          <dd>{a.first_noticed ? time(a.first_noticed) : "Not supplied"}</dd>
        </div>
        {a.source_created_at && (
          <div>
            <dt>Original linked message time</dt>
            <dd>{time(a.source_created_at)}</dd>
          </div>
        )}
      </dl>
      <h3>Evidence references</h3>
      <ul className="source-list">
        {a.evidence.map((e, i) => (
          <li key={`${e.value}-${i}`}>
            {e.kind === "link" ? (
              <a href={e.value} target="_blank" rel="noreferrer">
                {e.label}
              </a>
            ) : e.kind === "attachment" ? (
              <a
                href={`/api/chat/media?id=${e.value}&alpha=${version}`}
                target="_blank"
                rel="noreferrer"
              >
                {e.label} (private image)
              </a>
            ) : e.kind === "transaction" ? (
              <span>
                {e.label}: <code>{e.value}</code>
              </span>
            ) : (
              <span>{e.label} (immutable linked message version)</span>
            )}
          </li>
        ))}
      </ul>
      <details>
        <summary>Subject, identifiers and category context</summary>
        <p>
          {a.subject}
          {a.chain ? ` / ${a.chain}` : ""}
        </p>
        {a.contract && <code>{a.contract}</code>}
        <dl>
          {Object.entries(a.details)
            .filter(([, value]) => value)
            .map(([key, value]) => (
              <div key={key}>
                <dt>{key}</dt>
                <dd>{value}</dd>
              </div>
            ))}
        </dl>
      </details>
      <section className="section" aria-label="Preliminary AI review">
        <h3>Preliminary AI review</h3>
        <p className="muted">
          An evidence check, not acceptance, expertise certification or an XP
          decision.
        </p>
        {run?.status === "complete" && run.card ? (
          <>
            <p>{run.card.summary}</p>
            {run.card.claims.map((c, i) => (
              <article className="record" key={i}>
                <strong>{c.status}</strong>
                <p>{c.claim}</p>
                <p>{c.reason}</p>
                <ul>
                  {c.sources.map((id) => {
                    const s = run.sources.find((s) => s.id === id);
                    return s ? <Source key={id} source={s} /> : null;
                  })}
                </ul>
              </article>
            ))}
            <h4>Missing evidence</h4>
            <ul>
              {run.card.missingEvidence.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
            <h4>Risk questions</h4>
            <ul>
              {run.card.riskQuestions.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
            {run.card.priorWork.map((p) => {
              const prior = data.versions.find((v) => v.id === p.version);
              return prior ? (
                <p key={p.version}>
                  <Link href={`/findings/${prior.finding_id}`}>
                    Related prior work
                  </Link>
                  : {p.relationship.replaceAll("_", " ")}. {p.reason}
                </p>
              ) : null;
            })}
            <p>Next check: {run.card.nextCheck}</p>
            <p className="muted">
              {run.provider} / {run.model}. Saved{" "}
              {time(run.completed_at ?? run.created_at)}.
            </p>
          </>
        ) : (
          <p role="status">
            {run?.status === "blocked"
              ? run.error_code === "provider_not_configured"
                ? "AI review blocked: the provider credential is not configured. No model result exists."
                : "AI review blocked: owner approval for this content is not configured. No model result exists."
              : run?.status === "failed"
                ? "AI review unavailable. The submission remains pending; retry is available."
                : run?.status === "running"
                  ? "Preliminary review is running. No result is confirmed yet."
                  : "Preliminary review pending. No model result exists."}
          </p>
        )}
        {!!run?.checks.length && (
          <details>
            <summary>Deterministic checks</summary>
            <ul>
              {run.checks.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          </details>
        )}
        {!!run?.sources.length && (
          <details>
            <summary>All checked sources</summary>
            <ul>
              {run.sources.map((s) => (
                <Source key={s.id} source={s} />
              ))}
            </ul>
          </details>
        )}
        {canRetry && run?.status !== "complete" && (
          <AlphaAction
            version={version}
            action="preliminary"
            label={
              run?.status === "running"
                ? "Check review status"
                : "Retry preliminary review"
            }
          />
        )}
      </section>
      {data.creditStates?.some(
        (c) =>
          c.version_id === version && c.status === "blocked_no_approved_rule",
      ) && (
        <p className="notice">
          Review recorded. XP is blocked: no approved award rule covers this
          category. No award has been invented.
        </p>
      )}
      <section className="section">
        <h3>Later outcome</h3>
        {a.horizon ? (
          <>
            <p>
              Declared horizon: {time(a.horizon)}. {a.check_condition}
            </p>
            <p>
              {outcomes[0]
                ? `Latest observation: ${outcomes[0].status}.`
                : "Outcome pending. Initial evaluation does not establish a successful outcome."}
            </p>
            {Date.parse(a.horizon) <=
              Date.parse(data.serverTime ?? a.created_at) && (
              <AlphaAction
                action="outcomeCheck"
                version={version}
                label="Check due outcome"
              />
            )}
            {outcomes.map((o) => (
              <article key={o.id} className="record">
                <strong>{o.status}</strong> <time>{time(o.checked_at)}</time>
                <p>{o.facts}</p>
                <ul>
                  {o.sources.map((s) => (
                    <Source key={s.id} source={s} />
                  ))}
                </ul>
              </article>
            ))}
          </>
        ) : (
          <p>
            No time-bound outcome declared. This contribution is not counted as
            a successful prediction.
          </p>
        )}
      </section>
      <section className="section">
        <h3>Member feedback</h3>
        {data.alphaFeedback
          ?.filter((x) => x.version_id === version)
          .map((x) => (
            <blockquote key={x.id}>
              <p>
                {person(data, x.member_id)} / {x.kind} / {time(x.created_at)}
              </p>
              <p>{x.detail}</p>
              <a href={x.source} target="_blank" rel="noreferrer">
                Supporting source
              </a>
            </blockquote>
          ))}
        {f?.author_id !== data.memberId && (
          <details>
            <summary>Add sourced feedback</summary>
            <AlphaFeedback version={version} />
          </details>
        )}
        {f?.current_version === version &&
          ["accepted", "needs_correction", "rejected"].includes(f.status) && (
            <details>
              <summary>Request an independent appeal</summary>
              <AlphaFeedback version={version} appeal />
            </details>
          )}
      </section>
    </div>
  );
}
export function CategoryHistory({
  data,
  member,
}: {
  data: ResearchData;
  member: string;
}) {
  const permitted = {
    ...data,
    findings: data.findings.filter(
      (f) =>
        f.author_id === member &&
        (member === data.memberId || f.visibility === "members"),
    ),
  };
  const rows = categoryRecord(permitted, member).filter((r) => r.total);
  return (
    <section className="section">
      <h3>Category record</h3>
      <p className="muted">
        Initial evaluation and later outcomes are separate. Counts cover
        permitted current records in this rank, not a universal win rate.
      </p>
      {!rows.length ? (
        <p>No category-specific submissions recorded yet.</p>
      ) : (
        rows.map((r) => (
          <details key={r.category}>
            <summary>
              {r.category}: {r.total} submitted
            </summary>
            <p>
              {r.pending}/{r.total} pending; {r.reviewed}/{r.total} reviewed;{" "}
              {r.accepted}/{r.total} accepted; {r.corrected}/{r.total}{" "}
              corrected; {r.outcomeKnown}/{r.total} outcome known.
            </p>
            {r.records.map((f) => {
              const a = data.alphas?.find(
                (a) => a.version_id === f.current_version,
              );
              return (
                <p key={f.id}>
                  <Link href={`/findings/${f.id}`}>
                    {
                      data.versions.find((v) => v.id === f.current_version)
                        ?.claim
                    }
                  </Link>
                  {a?.horizon
                    ? ` / Horizon: ${time(a.horizon)}`
                    : " / No declared horizon"}
                </p>
              );
            })}
          </details>
        ))
      )}
    </section>
  );
}
export function SharedAlpha({ data }: { data: ResearchData }) {
  const records = data.findings.filter(
    (f) =>
      f.visibility === "members" &&
      data.alphas?.some((a) => a.version_id === f.current_version),
  );
  if (!records.length) return null;
  return (
    <details className="room-question">
      <summary>Shared alpha ({records.length})</summary>
      {records.map((f) => (
        <p key={f.id}>
          <span className="status-label">
            {f.status === "pending"
              ? "Pending review"
              : f.status.replaceAll("_", " ")}
          </span>{" "}
          <Link href={`/findings/${f.id}`}>
            {data.versions.find((v) => v.id === f.current_version)?.claim}
          </Link>{" "}
          / {person(data, f.author_id)}
        </p>
      ))}
    </details>
  );
}
