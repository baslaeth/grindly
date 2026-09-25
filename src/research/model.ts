import type { Database } from "@/types/database";

type Row<K extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][K]["Row"];
export const specialties = {
  operations: "Airdrop Hunter / Opportunity Operations",
  project: "Project Analyst",
  risk: "On-chain / Risk Analyst",
} as const;
export type Specialty = keyof typeof specialties;
export type Snapshot = {
  question: Row<"research_questions">;
  profiles: Row<"research_profiles">[];
  messages: Row<"discussion_messages">[];
  findings: Row<"findings">[];
  versions: Row<"finding_versions">[];
  assignments: Row<"review_assignments">[];
  decisions: Row<"review_decisions">[];
  uses: (Row<"finding_usefulness"> & {
    is_demo: boolean;
    qualifies: boolean;
  })[];
  disputes: Row<"finding_disputes">[];
  awards: Row<"award_ledger">[];
  requests: Row<"peer_requests">[];
  roles: string[];
  policy: Row<"research_policy">;
  assignment: Row<"research_assignment">;
};
export type ResearchData = Snapshot & {
  memberId: string;
  tiers: Record<string, string>;
  token: { id: string; contract: string; tier: string; mint: string | null };
};
export type Source = { url: string; label: string };
export function sources(value: unknown): Source[] {
  return Array.isArray(value)
    ? value.filter(
        (s): s is Source =>
          !!s &&
          typeof s === "object" &&
          typeof s.url === "string" &&
          typeof s.label === "string" &&
          /^https?:\/\//i.test(s.url),
      )
    : [];
}
export function specialtyLabel(value: string) {
  return specialties[value as Specialty] ?? "Specialty not set";
}
export function person(data: Snapshot, id: string) {
  return (
    data.profiles.find((p) => p.member_id === id)?.display_name ?? "Member"
  );
}
export function credit(data: Snapshot) {
  return {
    xp: data.awards.reduce((n, a) => n + a.xp, 0),
    points: data.awards
      .filter((a) => a.season === data.policy.season)
      .reduce((n, a) => n + a.points, 0),
  };
}

// Input must already be permission-filtered by research_snapshot. No hidden counts.
export function evidenceBrief(data: Snapshot) {
  const accepted = data.findings
    .filter((f) => f.status === "accepted")
    .flatMap((f) => {
      const version = data.versions.find((v) => v.id === f.current_version);
      return version
        ? [
            {
              finding: f,
              version,
              uses: data.uses.filter((u) => u.version_id === version.id),
            },
          ]
        : [];
    });
  const lineage = new Map<string, { url: string; findings: string[] }>();
  for (const record of accepted)
    for (const source of sources(record.version.sources)) {
      const url = new URL(source.url);
      url.hash = "";
      for (const key of [...url.searchParams.keys()])
        if (key.startsWith("utm_")) url.searchParams.delete(key);
      url.searchParams.sort();
      const key = url.toString().replace(/\/$/, "");
      const group = lineage.get(key) ?? { url: key, findings: [] };
      if (!group.findings.includes(record.finding.id))
        group.findings.push(record.finding.id);
      lineage.set(key, group);
    }
  return {
    accepted,
    lineage: [...lineage.values()],
    open: Object.keys(specialties).filter(
      (s) => !accepted.some((a) => a.version.specialty === s),
    ),
    corrections: data.findings.filter(
      (f) => f.status === "needs_correction" || f.status === "disputed",
    ),
  };
}
