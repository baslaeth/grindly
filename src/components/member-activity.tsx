import Link from "next/link";
import type { ResearchData } from "@/research/model";
export function MemberActivity({
  data,
  limit,
}: {
  data: ResearchData;
  limit?: number;
}) {
  const observations = (data.outcomeAssessments ?? []).flatMap((o) => {
    const version = data.versions.find((v) => v.id === o.version_id);
    const finding = data.findings.find(
      (f) => f.id === version?.finding_id && f.author_id === data.memberId,
    );
    return finding
      ? [
          {
            id: o.id,
            finding: finding.id,
            kind: "outcome" as const,
            xp: null,
            decision: null,
            createdAt: o.recorded_at,
            version: o.version_id,
          },
        ]
      : [];
  });
  const items = [...(data.activity ?? []), ...observations]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, limit);
  return (
    <section className="section" aria-label="Your activity">
      <h2>Activity</h2>
      {!items.length && <p>No evaluation updates or XP awards yet.</p>}
      <ul className="activity-list">
        {items.map((a) => (
          <li key={a.id}>
            <Link
              href={`/findings/${a.finding}${"version" in a ? `#outcome-${a.version}` : ""}`}
            >
              <strong>
                {a.kind === "outcome"
                  ? "Later outcome recorded"
                  : a.kind === "xp"
                    ? a.xp !== null && a.xp < 0 ? `${Math.abs(a.xp)} XP loss recorded` : `${a.xp} XP awarded`
                    : a.decision === "accept"
                      ? "Alpha accepted"
                      : a.decision === "reject"
                        ? "Alpha rejected with feedback"
                        : "Correction requested"}
              </strong>
              <span>
                {data.versions.find((v) => v.finding_id === a.finding)?.claim ??
                  "View your contribution"}
              </span>
            </Link>
            <time dateTime={a.createdAt}>
              {new Date(a.createdAt).toISOString().slice(0, 10)}
            </time>
          </li>
        ))}
      </ul>
    </section>
  );
}
