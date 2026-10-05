import Link from "next/link";
import { categoryRecord } from "@/alpha/model";
import type { ResearchData } from "@/research/model";
import { alphaTime } from "./review-assistant";
import { HistoryFilters } from "./history-filters";

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
    <section className="section" id="category-history">
      <h3>Category record</h3>
      <p className="muted">
        Counts cover permitted submissions in this rank. Initial decisions and
        later outcomes are separate; an outcome known is not automatically
        successful.
      </p>
      {!rows.length ? (
        <p>No category-specific submissions recorded yet.</p>
      ) : (
        <HistoryFilters
          groups={rows.map((r) => ({
            category: r.category,
            summary: (
              <><p>
                {r.total} submitted; {r.pending}/{r.total} pending; {r.reviewed}
                /{r.total} reviewed; {r.accepted}/{r.total} currently accepted;{" "}
                {r.corrected}/{r.total} corrected; {r.outcomeKnown}/{r.total}{" "}
                outcome known.
              </p>{(() => {
                const findingIds = new Set(r.records.map((f) => f.id));
                const versionIds = new Set(data.versions.filter((v) => findingIds.has(v.finding_id)).map((v) => v.id));
                const predictions = data.launchTerms?.filter((t) => versionIds.has(t.version_id) && t.prediction) ?? [];
                if (!predictions.length) return null;
                const latest = (id: string) => data.outcomeAssessments?.filter((o) => o.version_id === id)
                  .sort((a, b) => b.recorded_at.localeCompare(a.recorded_at))[0];
                const settlement = (id: string) => data.launchSettlements?.find((s) => s.version_id === id);
                const status = (value: string) => predictions.filter((t) => settlement(t.version_id)?.status === value).length;
                const inconclusive = predictions.filter((t) => !settlement(t.version_id) && latest(t.version_id)?.status === "inconclusive").length;
                const observedUnscored = predictions.filter((t) => !settlement(t.version_id) && latest(t.version_id)?.status === "known").length;
                const pending = predictions.length - status("Met") - status("Failed") - status("Cancelled") - status("Inconclusive") - inconclusive - observedUnscored;
                return <p>Prediction versions: {predictions.length}. Met {status("Met")}/{predictions.length}; Failed {status("Failed")}/{predictions.length}; Inconclusive {inconclusive + status("Inconclusive")}/{predictions.length}; Cancelled {status("Cancelled")}/{predictions.length}; Observed but unscored {observedUnscored}/{predictions.length}; Pending {pending}/{predictions.length}.</p>;
              })()}</>
            ),
            records: r.records.map((f) => {
              const versions = data.versions
                .filter((v) => v.finding_id === f.id)
                .sort((a, b) => a.version - b.version);
              const ids = versions.map((v) => v.id);
              return {
                id: f.id,
                pending: ["pending", "disputed"].includes(f.status),
                corrected: versions.length > 1,
                observed:
                  !!data.outcomeAssessments?.some((o) =>
                    ids.includes(o.version_id),
                  ) || !!data.outcomes?.some((o) => ids.includes(o.version_id)),
                due: !!data.alphas?.some(
                  (a) =>
                    ids.includes(a.version_id) &&
                    a.horizon &&
                    Date.parse(a.horizon) <=
                      Date.parse(data.serverTime ?? a.created_at),
                ),
                content: (
                  <article className="record">
                    <Link href={`/findings/${f.id}`}>
                      {versions.find((v) => v.id === f.current_version)?.claim}
                    </Link>
                    <p>{f.status.replaceAll("_", " ")}</p>
                    <details>
                      <summary>Versions, decisions and observations</summary>
                      {versions.map((v) => {
                        const a = data.alphas?.find(
                          (a) => a.version_id === v.id,
                        );
                        const duration = a?.horizon
                          ? (Date.parse(a.horizon) - Date.parse(a.created_at)) /
                            3600000
                          : null;
                        return (
                          <section className="section" key={v.id}>
                            <h4>
                              <Link href={`/findings/${f.id}#version-${v.id}`}>
                                Version {v.version}
                              </Link>
                            </h4>
                            <p>
                              Saved {alphaTime(v.submitted_at)}.{" "}
                              {v.correction
                                ? `Correction: ${v.correction}`
                                : "Original submission."}
                            </p>
                            <p>
                              {a?.horizon
                                ? `Declared horizon: ${alphaTime(a.horizon)}${duration !== null && duration > 0 ? ` (${duration.toFixed(1)} hours after this version was saved)` : ""}. Criteria: ${a.check_condition}`
                                : "No declared horizon."}
                            </p>
                            {data.decisions
                              .filter((d) => d.version_id === v.id)
                              .map((d) => (
                                <p key={d.id}>
                                  Initial decision: {d.decision},{" "}
                                  {alphaTime(d.created_at)}. {d.reason}
                                </p>
                              ))}
                            {data.launchXp?.filter((x) => x.version_id === v.id).map((x) =>
                              <p key={x.id}>Recorded {x.kind} XP: {x.xp}, {alphaTime(x.created_at)}.</p>)}
                            {data.launchSettlements?.filter((s) => s.version_id === v.id).map((s) =>
                              <p key={s.assessment_id}><Link href={`/findings/${f.id}#outcome-${v.id}`}>Prediction {s.status}</Link>, {alphaTime(s.settled_at)}. {s.reason}</p>)}
                            {data.disputes.filter((d) => d.version_id === v.id).map((d) =>
                              <p key={d.id}>Appeal: {d.reason}. {d.resolved_at ? "Resolved" : "Awaiting independent review"}.</p>)}
                            {data.outcomeAssessments
                              ?.filter((o) => o.version_id === v.id)
                              .map((o) => (
                                <p key={o.id}>
                                  <Link
                                    href={`/findings/${f.id}#outcome-${v.id}`}
                                  >
                                    Later observation: {o.status} /{" "}
                                    {o.relation.replaceAll("_", " ")}
                                  </Link>
                                  , {alphaTime(o.observed_at)}. {o.explanation}
                                </p>
                              ))}
                            {data.outcomes
                              ?.filter((o) => o.version_id === v.id)
                              .map((o) => (
                                <p key={o.id}>
                                  <Link
                                    href={`/findings/${f.id}#outcome-${v.id}`}
                                  >
                                    Source observation: {o.status}
                                  </Link>
                                  , {alphaTime(o.checked_at)}.
                                </p>
                              ))}
                          </section>
                        );
                      })}
                    </details>
                  </article>
                ),
              };
            }),
          }))}
        />
      )}
    </section>
  );
}
