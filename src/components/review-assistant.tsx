import Link from "next/link";
import type { ReactNode } from "react";
import { type ResearchData, person } from "@/research/model";
import {
  categoryFields,
  assessmentFields,
  reviewChecklist,
  unspecified,
} from "@/alpha/checklists";
import type { CheckedSource } from "@/alpha/model";
import { launchFields } from "@/launch/forms";
import { launchEvidenceIssues } from "@/launch/evidence-summary";
import { AlphaAction } from "./alpha-actions";
import { SourceObservations } from "./source-observations";
import { RefreshResearch } from "./research-forms";
import { campaignDates, guideOverview } from "@/alpha/guide-claims";

export const alphaTime = (s: string) =>
  new Date(s).toISOString().replace("T", " ").slice(0, 19) + " UTC";
function Question({
  enabled,
  title,
  children,
}: {
  enabled: boolean;
  title: string;
  children: ReactNode;
}) {
  return enabled ? (
    <details className="intelligence-question">
      <summary>{title}</summary>
      {children}
    </details>
  ) : (
    <>{children}</>
  );
}
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
  questions = false,
}: {
  data: ResearchData;
  version: string;
  questions?: boolean;
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
  const hints = (run?.hints ?? []).filter((hint) => {
    const prior = data.versions.find((v) => v.id === hint.version);
    return prior && data.findings.some((f) => f.id === prior.finding_id);
  });
  const analyses = data.preliminary
    ?.filter((r) => r.version_id === version)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
  const latest = analyses?.[0];
  const old = analyses?.find((r) => r.status === "complete") ?? latest;
  const sources = run?.sources ?? old?.sources ?? [];
  const versioned = data.checklistVersions?.find(
    (c) => c.version_id === version,
  );
  const checklist = reviewChecklist(a.category, a.contribution_type);
  const terms = data.launchTerms?.find((t) => t.version_id === version);
  const guide = data.airdropGuides?.find(
    (g) => g.version_id === version,
  )?.details;
  const gaps = terms
    ? launchFields[a.category].filter(
        (field) =>
          !(guide && field.key === "status") &&
          (terms.prediction || !field.fromPrediction) &&
          (!terms.context[field.key] ||
            unspecified(terms.context[field.key] ?? "")),
      )
    : categoryFields[a.category].filter(
        (field) =>
          !a.details[field.key] || unspecified(a.details[field.key] ?? ""),
      );
  const assigned = data.assignments.find(
    (r) => r.version_id === version && !r.completed_at,
  );
  const decisions = data.decisions.filter((d) => d.version_id === version);
  const lastChecked =
    runs.find((r) => r.status === "complete")?.completed_at ?? null;
  const unknownSources = sources.filter((s) => s.status !== "retrieved").length;
  const specificIssues = terms ? launchEvidenceIssues(a, terms, sources) : [];
  const contradictions =
    old?.status === "complete"
      ? (old.card?.claims.filter((c) => c.status === "contradicted").length ??
        0)
      : 0;
  const canRefresh =
    f.author_id === data.memberId || assigned?.reviewer_id === data.memberId;
  const overview =
    guide && old?.status === "complete" ? guideOverview(old.card) : null;
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
      <div className="analysis-freshness" role="status">
        <strong>
          {old?.status === "complete"
            ? "Saved preliminary analysis"
            : "No completed AI analysis for this version"}
        </strong>
        <span>
          {old?.status === "complete" && old.completed_at
            ? `Saved ${alphaTime(old.completed_at)}. `
            : ""}
          {data.localAIEnabled
            ? "Local analysis is configured on this machine."
            : "AI analysis is not connected yet."}
        </span>
        {old?.status === "complete" && (
          <span>
            Source refresh does not rerun this analysis.
            {lastChecked && old.completed_at && lastChecked > old.completed_at
              ? " Newer source checks are available below; the saved findings have not assessed them."
              : ""}
          </span>
        )}
        {runs[0]?.status === "failed" && (
          <span>
            The latest source refresh failed. Your alpha and earlier checks are
            preserved.
          </span>
        )}
      </div>
      {terms && (
        <div
          className="intelligence-overview"
          aria-label="Current evidence overview"
        >
          <p>
            <strong>What checks out:</strong>{" "}
            {overview?.supported.length
              ? "The following claims have preliminary source support."
              : "No assessed facts are ready to show yet. Source retrieval alone is not support."}
          </p>
          {!!overview?.supported.length && (
            <ul>
              {overview.supported.slice(0, 4).map((c, i) => (
                <li key={i}>
                  <strong>Supported (preliminary):</strong> {c.claim}
                </li>
              ))}
            </ul>
          )}
          <p>
            <strong>What needs attention:</strong> {gaps.length} category
            answers Unknown or missing; {unknownSources} sources unavailable.{" "}
            {contradictions
              ? `${contradictions} model-noted contradictions require reviewer confirmation.`
              : "No contradiction is independently established by retrieval alone."}
          </p>
          {old?.status === "complete" && old.card && (
            <ul>
              {old.card.claims
                .filter((c) => c.status !== "supported")
                .slice(0, 3)
                .map((c, i) => (
                  <li key={i}>
                    <strong>
                      {c.status === "unverified"
                        ? "Unknown"
                        : "Possible conflict"}{" "}
                      (preliminary):
                    </strong>{" "}
                    {c.claim}
                  </li>
                ))}
            </ul>
          )}
          <p>
            <strong>What to do next:</strong>{" "}
            {overview
              ? overview.next
              : "Check the official evidence and any missing context."}
          </p>
          <p>
            <strong>Review next step:</strong>{" "}
            {f.status === "needs_correction" &&
            f.author_id === data.memberId ? (
              <Link href={`/findings/new?revise=${version}`}>
                Submit a correction
              </Link>
            ) : f.status === "pending" ? (
              assigned ? (
                "Independent evaluation is pending."
              ) : (
                "Awaiting an authorized independent reviewer."
              )
            ) : a.horizon ? (
              "Check the original outcome criterion at its declared horizon."
            ) : (
              "Review the dated evidence and feedback."
            )}
          </p>
          <p>
            <strong>Last source check:</strong>{" "}
            {lastChecked ? alphaTime(lastChecked) : "Not checked yet"}.{" "}
            {terms.prediction && !terms.prediction_validated
              ? "Prediction is unvalidated and cannot earn outcome XP."
              : ""}
          </p>
          {!!specificIssues.length && (
            <ul>
              {specificIssues.map((issue) => (
                <li key={issue}>{issue}</li>
              ))}
            </ul>
          )}
          {guide && (
            <>
              <p>
                <strong>Author-declared stage:</strong> {guide.stage}. This is
                not an independently established campaign state.
              </p>
              {guide.stage === "Closed or historical" && (
                <p className="notice">
                  Historical guide. Past eligibility and opening announcements
                  do not establish a claim open today.
                </p>
              )}
              <details>
                <summary>Original airdrop guide context</summary>
                <dl>
                  {Object.entries(guide)
                    .filter(([key]) => key !== "version")
                    .map(([key, value]) => (
                      <div key={key}>
                        <dt>{key}</dt>
                        <dd>{value}</dd>
                      </div>
                    ))}
                </dl>
              </details>
            </>
          )}
          {old?.status === "complete" && old.card && (
            <details>
              <summary>Experimental model reasoning and suggestions</summary>
              <p>
                <strong>Experimental model interpretation:</strong>{" "}
                {old.card.summary}
              </p>
              <p className="muted">
                The local model can misread dates or overstate support. Check
                the quoted evidence before relying on its interpretation.
              </p>
              <p>
                <strong>Suggested check:</strong> {old.card.nextCheck}
              </p>
            </details>
          )}
          {guide && (
            <details>
              <summary>Campaign dates and their provenance</summary>
              {sources.map((s) => (
                <div key={s.id}>
                  <strong>{s.label}</strong>
                  <dl>
                    {campaignDates(s).map((fact) => (
                      <div key={fact.kind}>
                        <dt>{fact.kind}</dt>
                        <dd>
                          {fact.value ?? "Unknown"}. {fact.limitation}
                          {fact.passage && (
                            <blockquote>{fact.passage}</blockquote>
                          )}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </div>
              ))}
            </details>
          )}
        </div>
      )}
      {!questions && (
        <Link href={`/intelligence?alpha=${f.id}`} className="inline-link">
          Explore in Grind Intelligence
        </Link>
      )}
      <details className="intelligence-question">
        <summary>Completeness and provenance</summary>
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
      </details>
      <Question enabled={questions} title="What sources were checked?">
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
            The latest source check could not finish. Earlier observations
            remain; you can retry.
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
            Source refresh is temporarily unavailable while the review service
            is updated. Existing observations are preserved.
          </p>
        )}
      </Question>
      <Question enabled={questions} title="What information is missing?">
        <h4>Missing information and assessment questions</h4>
        {gaps.length ? (
          <ul>
            {gaps.map((g) => (
              <li key={g.key}>
                {g.label}:{" "}
                {(terms ? terms.context[g.key] : a.details[g.key]) ||
                  "not supplied in this version"}
                .
              </li>
            ))}
          </ul>
        ) : (
          <p>
            Category context is recorded. Completeness does not establish
            factual support.
          </p>
        )}
        <details>
          <summary>Category and contribution-type checklist</summary>
          <ul>
            {checklist.questions.map((q) => (
              <li key={q}>{q}</li>
            ))}
          </ul>
        </details>
      </Question>
      <Question enabled={questions} title="Is there related earlier alpha?">
        <h4>Related prior work</h4>
        {!hints.length ? (
          <p>
            No visible prior-work hints are recorded. This is not proof of
            originality or a semantic originality determination.
          </p>
        ) : (
          hints.map((h) => {
            const prior = data.versions.find((v) => v.id === h.version);
            const finding = data.findings.find(
              (f) => f.id === prior?.finding_id,
            );
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
      </Question>
      <h4>AI analysis</h4>
      {latest?.status === "running" && (
        <div className="analysis-freshness" role="status">
          <strong>Analysis is running</strong>
          <span>
            Your alpha is saved. Check for the result when the local model
            finishes.
          </span>
          <RefreshResearch label="Check analysis result" />
        </div>
      )}
      {latest && latest.id !== old?.id && latest.status !== "running" && (
        <p className="notice">
          The latest analysis did not complete. Your alpha and the earlier saved
          result are preserved; no new conclusion was added.
        </p>
      )}
      {a.category === "Airdrop Hunters" && data.localAIEnabled && (
        <p className="notice">
          Experimental local analysis can misread dates, overstate support and
          confuse historical announcements with current availability. Inspect
          the source passages; a model label is not verification.
        </p>
      )}
      <p>
        {data.localAIEnabled
          ? "Optional local AI analysis is configured. Results require independent assessment."
          : "AI analysis is not connected yet."}
      </p>
      {data.localAIEnabled &&
        latest?.status !== "running" &&
        (f.author_id === data.memberId ||
          assigned?.reviewer_id === data.memberId) && (
          <AlphaAction
            version={version}
            action="localReview"
            label={
              old?.status === "complete"
                ? "Run fresh local analysis"
                : "Run local preliminary analysis"
            }
          />
        )}
      {old?.provider === "ollama-local" && (
        <div>
          <p>
            Local model: {old.model}.{" "}
            {old.status === "complete"
              ? `Preliminary analysis saved${old.completed_at ? ` ${alphaTime(old.completed_at)}` : ""}; retained for this version`
              : old.status === "running"
                ? "Analysis pending"
                : "Analysis unavailable or failed validation; no conclusion saved"}
            .
          </p>
          {old.status === "complete" && old.card && (
            <details>
              <summary>Claim-by-claim model evidence</summary>
              {!terms && <p>{old.card.summary}</p>}
              {old.card.claims.map((c, i) => (
                <details key={i}>
                  <summary>
                    {c.status === "unverified" ? "Unknown" : c.status} /{" "}
                    {c.claim}
                  </summary>
                  <p>{c.reason}</p>
                  {c.field && (
                    <p className="muted">
                      Field: {c.field}. Campaign: {c.campaign}. Assessed{" "}
                      {c.assessedAt ? alphaTime(c.assessedAt) : "Unknown"}.
                    </p>
                  )}
                  {c.original && (
                    <details>
                      <summary>Original field text</summary>
                      <p>{c.original}</p>
                    </details>
                  )}
                  {c.evidenceLinks.map((link, j) => {
                    const s = old.sources.find((s) => s.id === link.source);
                    return (
                      <div key={j}>
                        <blockquote>{link.excerpt}</blockquote>
                        <p>{link.relationship}</p>
                        {s && (
                          <ul>
                            <CheckedEvidence source={s} />
                          </ul>
                        )}
                      </div>
                    );
                  })}
                </details>
              ))}
              <p>
                Missing evidence:{" "}
                {old.card.missingEvidence.join("; ") ||
                  "No additional gaps identified by this model; not proof of completeness."}
              </p>
              <ul>
                {old.card.riskQuestions.map((q, i) => (
                  <li key={i}>{q}</li>
                ))}
              </ul>
              <p>Suggested next check (not scheduled): {old.card.nextCheck}</p>
            </details>
          )}
        </div>
      )}
      <p className="muted">
        Source and submission checks are not AI interpretation. Local model
        output, when explicitly requested, is preliminary and cannot approve
        work or award XP. No quality score is implied.
      </p>
      <details>
        <summary>Earlier saved analyses and source snapshots</summary>
        {data.preliminary
          ?.filter((r) => r.version_id === version && r.id !== old?.id)
          .map((r) => (
            <details key={r.id}>
              <summary>
                {alphaTime(r.created_at)} / {r.model ?? "Model unavailable"} /{" "}
                {r.status}
              </summary>
              <p>
                Historical preliminary output, not the current assessment.
                Earlier mistakes remain recorded.
              </p>
              {r.card?.claims.map((c, i) => (
                <p key={i}>
                  {c.status}: {c.claim} / {c.reason}
                </p>
              ))}
              <ul>
                {r.sources.map((s) => (
                  <CheckedEvidence key={s.id} source={s} />
                ))}
              </ul>
            </details>
          ))}
        {runs.slice(1).map((r) => (
          <details key={r.id}>
            <summary>
              Source check {alphaTime(r.created_at)} / {r.status}
            </summary>
            <ul>
              {r.sources.map((s) => (
                <CheckedEvidence key={s.id} source={s} />
              ))}
            </ul>
          </details>
        ))}
      </details>
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
