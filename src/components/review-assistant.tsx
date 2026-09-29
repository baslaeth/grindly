import Link from "next/link";
import { type ResearchData, person } from "@/research/model";
import {
  categoryFields,
  assessmentFields,
  reviewChecklist,
  unspecified,
} from "@/alpha/checklists";
import type { CheckedSource } from "@/alpha/model";
import { AlphaAction } from "./alpha-actions";
import { SourceObservations } from "./source-observations";

export const alphaTime = (s: string) =>
  new Date(s).toISOString().replace("T", " ").slice(0, 19) + " UTC";
export function CheckedEvidence({
  source,
  operator = false,
}: {
  source: CheckedSource;
  operator?: boolean;
}) {
  return (
    <li>
      <strong>{source.status === "retrieved" ? "Retrieved" : "Unknown"}</strong>
      {" / "}
      {source.url ? (
        <a href={source.url} target="_blank" rel="noreferrer">
          {source.label}
        </a>
      ) : (
        source.label
      )}
      <p className="muted">
        Checked {alphaTime(source.checkedAt)}.{" "}
        {source.publishedAt
          ? `Source date: ${alphaTime(source.publishedAt)}.`
          : "Source publication date is unknown."}
      </p>
      <details>
        <summary>What was retrieved and its limits</summary>
        <SourceObservations facts={source.facts} />
        {operator && source.digest && (
          <p className="muted">Snapshot SHA-256: {source.digest}</p>
        )}
      </details>
    </li>
  );
}
export function ReviewAssistant({
  data,
  version,
}: {
  data: ResearchData;
  version: string;
}) {
  const a = data.alphas?.find((a) => a.version_id === version);
  const v = data.versions.find((v) => v.id === version);
  const f = data.findings.find((f) => f.id === v?.finding_id);
  if (!a || !v || !f) return null;
  const runs =
    data.sourceChecks
      ?.filter((r) => r.version_id === version)
      .sort((a, b) => b.created_at.localeCompare(a.created_at)) ?? [];
  const run = runs.find((r) => r.status === "complete") ?? runs[0];
  const old = data.preliminary
    ?.filter((r) => r.version_id === version)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
  const sources = run?.sources ?? old?.sources ?? [];
  const versioned = data.checklistVersions?.find(
    (c) => c.version_id === version,
  );
  const questions = reviewChecklist(a.category, a.contribution_type);
  const gaps = categoryFields[a.category].filter(
    (field) => !a.details[field.key] || unspecified(a.details[field.key] ?? ""),
  );
  const assigned = data.assignments.find(
    (r) => r.version_id === version && !r.completed_at,
  );
  const decisions = data.decisions.filter((d) => d.version_id === version);
  const canRefresh =
    f.author_id === data.memberId || assigned?.reviewer_id === data.memberId;
  return (
    <section
      className="section review-assistant"
      id={`review-assistant-${version}`}
      aria-label={`Review Assistant version ${v.version}`}
    >
      <div className="section-heading">
        <h3>Review Assistant</h3>
        <span className="status-label">Version {v.version}</span>
      </div>
      <p>
        Evidence checks help you and an independent reviewer assess this alpha.
        Retrieving a source does not establish that the claim is supported.
      </p>
      <h4>Completeness and provenance</h4>
      <p>
        Saved {alphaTime(a.created_at)}.{" "}
        {versioned
          ? `Category checklist ${versioned.checklist}.`
          : "Earlier submission: newer context questions may still need answers."}
      </p>
      <p>
        {a.first_noticed
          ? `First noticed ${alphaTime(a.first_noticed)} (self-reported).`
          : "No self-reported first-noticed date."}{" "}
        First in Grindly does not establish first discovery elsewhere.
      </p>
      {a.source_created_at && (
        <p>
          Original linked message: {alphaTime(a.source_created_at)}. Its
          author&apos;s attribution is retained.
        </p>
      )}
      <details>
        <summary>Recorded checks</summary>
        <ul>
          {(
            run?.checks ??
            old?.checks ?? [
              "Source checks have not completed yet. Your submission is saved.",
            ]
          ).map((c, i) => (
            <li key={i}>{c}</li>
          ))}
        </ul>
      </details>
      <h4>Retrieved evidence</h4>
      {!sources.length ? (
        <p>
          {runs[0]?.status === "running"
            ? "Checking the permitted sources. Your alpha is saved; you can continue while checks finish."
            : "No source observations saved yet. Refresh sources to check available references."}
        </p>
      ) : (
        <ul className="source-list">
          {sources.map((s) => (
            <CheckedEvidence
              key={s.id}
              source={s}
              operator={data.roles.includes("steward")}
            />
          ))}
        </ul>
      )}
      {runs[0]?.status === "failed" && (
        <p role="status">
          The latest source check could not finish. Earlier observations remain;
          you can retry.
        </p>
      )}
      {canRefresh && data.evaluationAvailable !== false && (
        <AlphaAction
          action="refreshSources"
          version={version}
          label="Refresh sources"
        />
      )}
      {data.evaluationAvailable === false && (
        <p>
          Source refresh is temporarily unavailable while the review service is
          updated. Existing observations are preserved.
        </p>
      )}
      <h4>Missing information and assessment questions</h4>
      {gaps.length ? (
        <ul>
          {gaps.map((g) => (
            <li key={g.key}>
              {g.label}: {a.details[g.key] || "not supplied in this version"}.
            </li>
          ))}
        </ul>
      ) : (
        <p>
          Category context is recorded. Completeness does not establish factual
          support.
        </p>
      )}
      <details>
        <summary>Category and contribution-type checklist</summary>
        <ul>
          {questions.questions.map((q) => (
            <li key={q}>{q}</li>
          ))}
        </ul>
      </details>
      <h4>Related prior work</h4>
      {!run?.hints.length ? (
        <p>
          No visible prior-work hints are recorded. This is not proof of
          originality; semantic comparison is not connected.
        </p>
      ) : (
        run.hints.map((h) => {
          const prior = data.versions.find((v) => v.id === h.version);
          const finding = data.findings.find((f) => f.id === prior?.finding_id);
          return prior && finding ? (
            <p key={h.version}>
              <Link href={`/findings/${finding.id}#version-${prior.id}`}>
                {prior.claim}
              </Link>
              {" / "}
              {person(data, finding.author_id)} / version {prior.version},{" "}
              {alphaTime(prior.submitted_at)}. {h.signals.join("; ")}. Shared
              sources or similar wording are hints for review, not copying
              accusations.
            </p>
          ) : null;
        })
      )}
      <h4>AI analysis</h4>
      <p>AI analysis is not connected yet.</p>
      <p className="muted">
        The checks above are recorded source and submission checks, not AI
        interpretation. No model result or quality score is implied.
      </p>
      <h4>Independent review</h4>
      {decisions.length ? (
        decisions.map((d) => (
          <p key={d.id}>
            {d.decision === "accept"
              ? "Accepted within the recorded scope"
              : d.decision === "reject"
                ? "Rejected with feedback"
                : "Correction requested"}{" "}
            by {person(data, d.reviewer_id)}, {alphaTime(d.created_at)}.{" "}
            {d.reason}
          </p>
        ))
      ) : (
        <p>
          {assigned
            ? "Pending review by an assigned independent reviewer."
            : "Waiting for an authorized independent reviewer. Add evidence or invite sourced feedback while this remains pending."}
        </p>
      )}
      <p>
        Review, XP and later outcomes are separate. A useful accepted
        contribution is not necessarily a successful forecast.
      </p>
      {data.reviewAssessments
        ?.filter((r) => decisions.some((d) => d.id === r.decision_id))
        .map((r) => (
          <details key={r.decision_id}>
            <summary>Recorded reviewer assessment / {r.checklist}</summary>
            <dl>
              {assessmentFields.map((f) => (
                <div key={f.key}>
                  <dt>{f.label}</dt>
                  <dd>{r.assessment[f.key]}</dd>
                </div>
              ))}
            </dl>
          </details>
        ))}
      <Link className="inline-link" href={`#outcome-${version}`}>
        Later outcome and observations
      </Link>
    </section>
  );
}
