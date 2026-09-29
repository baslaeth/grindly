import Link from "next/link";
import { categoryFields } from "@/alpha/checklists";
import { contributionTypes } from "@/alpha/model";
import { type ResearchData, person } from "@/research/model";
import { AlphaFeedback } from "./alpha-actions";
import { ReviewAssistant, alphaTime } from "./review-assistant";
import { AlphaOutcomes } from "./alpha-outcomes";
export { CategoryHistory } from "./category-history";

export function AlphaDetails({
  data,
  version,
}: {
  data: ResearchData;
  version: string;
}) {
  const a = data.alphas?.find((a) => a.version_id === version);
  if (!a) return null;
  const v = data.versions.find((v) => v.id === version);
  const f = data.findings.find((f) => f.id === v?.finding_id);
  return (
    <div className="alpha-detail">
      <p>
        <strong>{a.category}</strong> / {contributionTypes[a.contribution_type]}
      </p>
      <p>{a.purpose}</p>
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
      <ReviewAssistant data={data} version={version} />
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
