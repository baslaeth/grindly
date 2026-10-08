import Link from "next/link";
import { categoryFields } from "@/alpha/checklists";
import { contributionTypes } from "@/alpha/model";
import { type ResearchData, person } from "@/research/model";
import { AlphaFeedback } from "./alpha-actions";
import { ReviewAssistant, alphaTime } from "./review-assistant";
import { AlphaOutcomes } from "./alpha-outcomes";
import { AlphaFollow } from "./alpha-follow";
import { ReverseWorkAward } from "./reverse-work-award";
import { AlphaSummary } from "./alpha-summary";
import { AlphaFeed } from "./alpha-feed";
export { CategoryHistory } from "./category-history";

export function AlphaDetails({
  data,
  version,
  showFollow = true,
}: {
  data: ResearchData;
  version: string;
  showFollow?: boolean;
}) {
  const a = data.alphas?.find((a) => a.version_id === version);
  if (!a) return null;
  const v = data.versions.find((v) => v.id === version);
  const f = data.findings.find((f) => f.id === v?.finding_id);
  const terms = data.launchTerms?.find((t) => t.version_id === version);
  const watch = data.follows?.find((item) => item.finding_id === f?.id);
  const workXp =
    data.launchXp
      ?.filter(
        (event) =>
          event.finding_id === f?.id &&
          ["work", "reversal"].includes(event.kind),
      )
      .reduce((sum, event) => sum + event.xp, 0) ?? 0;
  return (
    <div className="alpha-detail">
      <p>
        <strong>{a.category}</strong> / {contributionTypes[a.contribution_type]}
      </p>
      {a.purpose !== v?.claim && a.purpose !== v?.addition && (
        <p>{a.purpose}</p>
      )}
      {terms && (
        <>
          {![v?.claim, v?.addition, a.purpose].includes(
            terms.useful_action,
          ) && <p>{terms.useful_action}</p>}
          {terms.cost_or_risk !== v?.limitations && (
            <p>Main cost or risk: {terms.cost_or_risk}</p>
          )}
          <p>
            Reviewed work XP: {workXp}.{" "}
            {terms.prediction
              ? terms.prediction_validated
                ? "Prediction terms registered; outcome separate."
                : "Prediction unvalidated; no outcome XP until requirements are met."
              : "No prediction attached."}
          </p>
          {showFollow && f?.current_version === version && (
            <AlphaFollow
              finding={f.id}
              deadline={a.horizon}
              followed={!!watch}
              participated={watch?.participated ?? false}
            />
          )}
          {data.launchReviewable?.includes(version) &&
            data.launchXp
              ?.filter(
                (event) =>
                  event.version_id === version &&
                  event.kind === "work" &&
                  event.xp > 0 &&
                  !data.launchXp?.some(
                    (reversal) =>
                      reversal.kind === "reversal" &&
                      reversal.basis_id === event.id,
                  ),
              )
              .map((event) => (
                <ReverseWorkAward key={event.id} award={event.id} />
              ))}
        </>
      )}
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
        {a.contract && (
          <p>
            <code>{a.contract}</code> / recorded reference; verification
            coverage is shown below.
          </p>
        )}
        <dl>
          {Object.entries(a.details)
            .filter(([, value]) => value)
            .map(([key, value]) => (
              <div key={key}>
                <dt>
                  {categoryFields[a.category].find((f) => f.key === key)
                    ?.label ?? key}
                </dt>
                <dd>{value}</dd>
              </div>
            ))}
        </dl>
      </details>
      <details className="review-disclosure">
        <summary>Source checks, AI analysis and human review</summary>
        <ReviewAssistant data={data} version={version} questions />
      </details>
      {data.creditStates?.some(
        (c) =>
          c.version_id === version && c.status === "blocked_no_approved_rule",
      ) && (
        <p className="notice">
          Review recorded. XP is awaiting an approved category award rule. No XP
          has been awarded for this decision.
        </p>
      )}
      <AlphaOutcomes data={data} version={version} />
      <section className="section">
        <h3>Member feedback</h3>
        {data.alphaFeedback
          ?.filter((x) => x.version_id === version)
          .map((x) => (
            <blockquote key={x.id}>
              <p>
                {person(data, x.member_id)} / {x.kind} /{" "}
                {alphaTime(x.created_at)}
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
export function SharedAlpha({ data }: { data: ResearchData }) {
  const records = data.findings
    .filter((f) => f.visibility === "members" || f.author_id === data.memberId)
    .sort((a, b) =>
      (
        data.versions.find((v) => v.id === b.current_version)?.submitted_at ??
        ""
      ).localeCompare(
        data.versions.find((v) => v.id === a.current_version)?.submitted_at ??
          "",
      ),
    );
  if (!records.length)
    return (
      <p className="empty-state">
        No shared alphas in this room yet.{" "}
        <Link href="/findings/new">Share the first finding</Link>.
      </p>
    );
  return (
    <AlphaFeed
      entries={records.map((f) => ({
        id: f.id,
        status: f.status,
        search: `${data.alphas?.find((a) => a.version_id === f.current_version)?.subject ?? ""} ${data.versions.find((v) => v.id === f.current_version)?.claim ?? ""} ${person(data, f.author_id)}`,
        content: (
          <AlphaSummary data={data} version={f.current_version!} preview />
        ),
      }))}
    />
  );
}
