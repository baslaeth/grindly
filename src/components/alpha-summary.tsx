import Link from "next/link";
import { ArrowRight, ListChecks, ShieldAlert, FileSearch } from "lucide-react";
import { type ResearchData, person } from "@/research/model";
import { contributionTypes } from "@/alpha/model";

export function AlphaSummary({
  data,
  version,
  preview = false,
}: {
  data: ResearchData;
  version: string;
  preview?: boolean;
}) {
  const v = data.versions.find((item) => item.id === version);
  const a = data.alphas?.find((item) => item.version_id === version);
  const f = data.findings.find((item) => item.id === v?.finding_id);
  if (!v || !f) return null;
  const guide = data.airdropGuides?.find(
    (item) => item.version_id === version,
  )?.details;
  const terms = data.launchTerms?.find((item) => item.version_id === version);
  const sample = data.profiles.find(
    (p) => p.member_id === f.author_id,
  )?.is_demo;
  const risks = [
    ...new Set(
      [
        v.limitations,
        terms?.cost_or_risk,
        guide?.speculative,
        guide?.exclusions,
      ].filter((s): s is string => !!s),
    ),
  ];
  return (
    <div className={preview ? "alpha-preview" : "alpha-summary"}>
      {preview && (
        <>
          <div className="alpha-meta">
            <span className={`status-label status-${f.status}`}>
              {f.status === "pending"
                ? "Pending review"
                : f.status.replaceAll("_", " ")}
            </span>
            {sample && <span className="sample-label">Sample</span>}
            {f.visibility === "reviewers" && (
              <span className="status-label">Private to review team</span>
            )}
            <span>{a?.category}</span>
          </div>
          <h3>
            <Link href={`/findings/${f.id}`}>{a?.subject ?? v.claim}</Link>
          </h3>
          <p className="muted">
            {person(data, f.author_id)}
            {a ? ` · ${contributionTypes[a.contribution_type]}` : ""}
          </p>
        </>
      )}
      <div className="alpha-reading-grid">
        <section className="alpha-reading-block">
          <h3>
            <FileSearch size={17} aria-hidden="true" />{" "}
            {guide ? "What the author reports" : "The finding"}
          </h3>
          <p className={preview ? "alpha-excerpt" : "preserve-lines"}>
            {guide?.confirmed ?? v.claim}
          </p>
          {!preview &&
            a?.purpose &&
            ![v.claim, v.addition].includes(a.purpose) && (
              <>
                <h4>Why it matters</h4>
                <p className="preserve-lines">{a.purpose}</p>
              </>
            )}
        </section>
        {!preview && (
          <section className="alpha-reading-block">
            <h3>
              <ListChecks size={17} aria-hidden="true" />{" "}
              {guide ? "Steps to follow" : "The contributor's work"}
            </h3>
            <p className="preserve-lines">{guide?.steps ?? v.addition}</p>
            {guide && (
              <>
                <h4>Before you start</h4>
                <p className="preserve-lines">{guide.prerequisites}</p>
              </>
            )}
          </section>
        )}
      </div>
      {preview ? (
        <>
          <p className="alpha-risk-line">
            <ShieldAlert size={16} aria-hidden="true" />
            <span>
              <strong>Main risk:</strong> {v.limitations || "Not provided"}
            </span>
          </p>
          {risks.some((risk) => risk !== v.limitations) && (
            <details className="alpha-risk-preview">
              <summary>Other risks and unknowns</summary>
              {risks
                .filter((risk) => risk !== v.limitations)
                .map((risk, i) => (
                  <p key={i} className="preserve-lines">
                    {risk}
                  </p>
                ))}
            </details>
          )}
        </>
      ) : (
        <aside className="alpha-risk">
          <h3>
            <ShieldAlert size={17} aria-hidden="true" /> Risks and unknowns
          </h3>
          {risks.map((risk, i) => (
            <p key={i} className="preserve-lines">
              {risk}
            </p>
          ))}
        </aside>
      )}
      {!preview && guide && (
        <details>
          <summary>Testing, stage and contributor&apos;s notes</summary>
          <p>Author-declared stage: {guide.stage}</p>
          <p className="preserve-lines">{guide.testEvidence}</p>
          <p className="preserve-lines">{v.addition}</p>
        </details>
      )}
      {preview && (
        <Link className="inline-link alpha-open" href={`/findings/${f.id}`}>
          Read alpha <ArrowRight size={15} aria-hidden="true" />
        </Link>
      )}
    </div>
  );
}
