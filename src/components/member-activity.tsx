import Link from "next/link";
import type { ResearchData } from "@/research/model";
export function MemberActivity({
  data,
  limit,
}: {
  data: ResearchData;
  limit?: number;
}) {
  const items = (data.activity ?? []).slice(0, limit);
  return (
    <section className="section" aria-label="Your activity">
      <h2>Activity</h2>
      {!items.length && <p>No evaluation updates or XP awards yet.</p>}
      <ul className="activity-list">
        {items.map((a) => (
          <li key={a.id}>
            <Link href={`/findings/${a.finding}`}>
              <strong>
                {a.kind === "xp"
                  ? `${a.xp} XP awarded`
                  : a.decision === "accept"
                    ? "Alpha accepted"
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
