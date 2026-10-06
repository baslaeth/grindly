import Link from "next/link";
import { type ResearchData, person } from "@/research/model";
import { ReviewAssistant, alphaTime } from "./review-assistant";
import { AlphaOutcomes } from "./alpha-outcomes";

export function GrindIntelligence({
  data,
  id,
}: {
  data: ResearchData;
  id?: string;
}) {
  // The server snapshot has already filtered rank, audience and demo permissions.
  const available = data.findings.filter((f) =>
    data.alphas?.some((a) => a.version_id === f.current_version),
  );
  const finding =
    available.find((f) => f.id === id) ?? (!id ? available[0] : undefined);
  const version = data.versions.find((v) => v.id === finding?.current_version);
  const alpha = data.alphas?.find((a) => a.version_id === version?.id);
  return (
    <>
      <form action="/intelligence" className="intelligence-picker">
        <label htmlFor="intelligence-alpha">Select an alpha</label>
        <select
          id="intelligence-alpha"
          name="alpha"
          defaultValue={finding?.id ?? ""}
          required
          disabled={!available.length}
        >
          {!available.length && (
            <option value="">No accessible alphas yet</option>
          )}
          {available.map((f) => (
            <option key={f.id} value={f.id}>
              {data.versions.find((v) => v.id === f.current_version)?.claim ??
                "Saved alpha"}
            </option>
          ))}
        </select>
        <button className="button" disabled={!available.length}>
          Open alpha
        </button>
      </form>
      {!finding || !version || !alpha ? (
        <p role="status">
          {id
            ? "This alpha is unavailable to your membership."
            : "No permitted alphas yet. Submit your first alpha from Hub to start an evidence history."}
        </p>
      ) : (
        <>
          <section className="section" aria-label="Selected alpha">
            <h2>{alpha.subject}</h2>
            <details>
              <summary>Original action or claim</summary>
              <p>{version.claim}</p>
            </details>
            <p>
              {alpha.category} / {person(data, finding.author_id)} / version{" "}
              {version.version}
            </p>
            <p>
              Submitted {alphaTime(version.submitted_at)} /{" "}
              <strong>
                {finding.status === "pending"
                  ? "Pending review"
                  : finding.status.replaceAll("_", " ")}
              </strong>
            </p>
            <Link
              href={`/findings/${finding.id}#review-assistant-${version.id}`}
              className="inline-link"
            >
              Open alpha and Review Assistant
            </Link>
          </section>
          <ReviewAssistant data={data} version={version.id} questions />
          <details className="section intelligence-question">
            <summary>What happened after the declared horizon?</summary>
            <AlphaOutcomes data={data} version={version.id} />
            <Link href={`/findings/${finding.id}`} className="inline-link">
              All versions and outcome history
            </Link>
          </details>
        </>
      )}
    </>
  );
}
