import Link from "next/link";
import { type ResearchData, person } from "@/research/model";
import { alphaTime, CheckedEvidence } from "./review-assistant";
import { AlphaAction } from "./alpha-actions";
import { OutcomeForm } from "./outcome-form";
export function AlphaOutcomes({
  data,
  version,
}: {
  data: ResearchData;
  version: string;
}) {
  const a = data.alphas?.find((a) => a.version_id === version);
  if (!a) return null;
  const due =
    !!a.horizon &&
    Date.parse(a.horizon) <= Date.parse(data.serverTime ?? a.created_at);
  const automatic =
    data.outcomes?.filter((o) => o.version_id === version) ?? [];
  const assessments =
    data.outcomeAssessments?.filter((o) => o.version_id === version) ?? [];
  const settlement = data.launchSettlements?.find((o) => o.version_id === version);
  return (
    <section
      className="section"
      id={`outcome-${version}`}
      aria-label="Outcome history"
    >
      <h3>Later outcome</h3>
      {a.horizon ? (
        <>
          <p>Declared horizon: {alphaTime(a.horizon)}.</p>
          <p>Original criteria: {a.check_condition || "Not supplied."}</p>
        </>
      ) : (
        <p>
          No time-bound outcome declared. This contribution is not evaluated as
          a price prediction.
        </p>
      )}
      {!assessments.length && (
        <p>
          {automatic[0]
            ? `Latest observation: ${automatic[0].status}.`
            : "Outcome pending. Initial evaluation does not establish a successful outcome."}
        </p>
      )}
      {settlement && <p className="notice">Prediction settlement: {settlement.status}. {settlement.reason} Outcome XP: {settlement.awarded_xp}.</p>}
      {!settlement && data.launchTerms?.some((t) => t.version_id === version && t.prediction) &&
        <p>Prediction not settled. A reviewer observation alone does not establish outcome XP.</p>}
      {due && (
        <AlphaAction
          action="outcomeCheck"
          version={version}
          label="Check due outcome"
        />
      )}
      {assessments.map((o) => (
        <article className="record" key={o.id}>
          <h4>
            {o.status} / {o.relation.replaceAll("_", " ")}
          </h4>
          <p>
            Observed {alphaTime(o.observed_at)}. Recorded{" "}
            {alphaTime(o.recorded_at)} by {person(data, o.actor_id)}.
          </p>
          <p>{o.facts}</p>
          <p>
            <strong>Comparison:</strong> {o.explanation}
          </p>
          <p>
            <strong>Uncertainty:</strong> {o.uncertainty}
          </p>
          <ul>
            {o.sources.map((s, i) => (
              <li key={i}>
                <a href={s.url} target="_blank" rel="noreferrer">
                  {s.label}
                </a>
                {s.publishedAt
                  ? ` / reviewer-reported source date ${alphaTime(s.publishedAt)}`
                  : " / source date unknown"}
              </li>
            ))}
          </ul>
          <p className="muted">
            Known describes the evidence state, not an automatic successful
            prediction or XP award.
          </p>
        </article>
      ))}
      {automatic.map((o) => (
        <details key={o.id}>
          <summary>
            Source observation: {o.status}, {alphaTime(o.checked_at)}
          </summary>
          <p>{o.facts}</p>
          <ul>
            {o.sources.map((s) => (
              <CheckedEvidence key={s.id} source={s} />
            ))}
          </ul>
        </details>
      ))}
      {due && data.outcomeReviewable?.includes(version) && (
        <details>
          <summary>Record independent outcome</summary>
          <OutcomeForm version={version} />
        </details>
      )}
      {due && !data.outcomeReviewable?.includes(version) && (
        <p>
          An authorized independent category reviewer can record a conclusion.
          You can add sourced feedback; authors cannot assess their own
          outcomes.
        </p>
      )}
    </section>
  );
}
export function DueOutcomes({ data }: { data: ResearchData }) {
  const due =
    data.alphas?.filter(
      (a) =>
        a.horizon &&
        Date.parse(a.horizon) <= Date.parse(data.serverTime ?? a.created_at) &&
        data.outcomeReviewable?.includes(a.version_id),
    ) ?? [];
  return (
    <section className="section" id="due-outcomes">
      <h2>Due outcomes</h2>
      <p>
        Compare dated observations with the original version. These checks are
        triggered explicitly, not scheduled automatically.
      </p>
      {!due.length ? (
        <p>
          No due contributions within your current independent category scope.
        </p>
      ) : (
        due.map((a) => {
          const v = data.versions.find((v) => v.id === a.version_id)!,
            f = data.findings.find((f) => f.id === v.finding_id)!;
          const latest = data.outcomeAssessments?.find(
            (o) => o.version_id === v.id,
          );
          return (
            <p key={v.id}>
              <Link href={`/findings/${f.id}#outcome-${v.id}`}>{v.claim}</Link>{" "}
              / {a.category} / {person(data, f.author_id)} / version {v.version}{" "}
              / due {alphaTime(a.horizon!)} /{" "}
              {latest
                ? `last observation: ${latest.status}`
                : "awaiting outcome assessment"}
            </p>
          );
        })
      )}
    </section>
  );
}
