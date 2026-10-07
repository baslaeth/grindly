import type { Database } from "@/types/database";
import type { AlphaSnapshot } from "@/alpha/model";
import { categories } from "./spaces";

type Row<K extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][K]["Row"];
export const specialties = {
  operations: "Airdrop Hunter / Opportunity Operations",
  project: "Project Analyst",
  risk: "On-chain / Risk Analyst",
} as const;
export type Specialty = keyof typeof specialties;
export type Snapshot = Partial<AlphaSnapshot> & {
  alphaSchemaAvailable?: boolean;
  localAIEnabled?: boolean;
  question: Row<"research_questions">;
  profiles: (Row<"research_profiles"> & { primary_focus?: string | null })[];
  messages: (Row<"discussion_messages"> & {
    revision?: string;
    deleted?: boolean;
  })[];
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
  assignment: Row<"research_assignment"> | null;
  rooms?: Row<"research_questions">[];
  directory?: SpaceMember[];
  personalCredit?: { xp: number; points: number };
  demoProfiles?: Row<"rank_demo_profiles">[];
  demoMessages?: Row<"rank_demo_messages">[];
  demoDelegations?: Row<"rank_demo_delegations">[];
  sourceSnapshots?: {
    attachments?: { id: string; type: string }[];
    version: string;
    message: string;
    revision: string;
    author: string;
    body: string;
    specialty: string;
    room: string;
    createdAt: string;
  }[];
  activity?: {
    id: string;
    finding: string;
    kind: "evaluation" | "xp";
    xp: number | null;
    decision: string | null;
    createdAt: string;
  }[];
};
export type SpaceMember = {
  id: string;
  name: string;
  bio: string;
  specialty: string;
  is_demo: boolean;
  tier: string;
  token: string;
  contract: string;
  bound_at: string;
  personal_xp: number;
  acquisitions: {
    kind: "newly_issued" | "purchased" | "unknown";
    at: string;
  }[];
  progression: { kind: "progressed"; at: string; tier: string }[];
};
export type ResearchData = Snapshot & {
  memberId: string;
  memberEmail?: string;
  monitoringSchedule?: "hosted-daily" | "local";
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
  if ((categories as readonly string[]).includes(value)) return value;
  return specialties[value as Specialty] ?? "Specialty not set";
}
export function person(data: Snapshot, id: string) {
  return (
    data.profiles.find((p) => p.member_id === id)?.display_name ?? "Member"
  );
}
// Profiles are public-to-this-rank summaries, not a shortcut into reviewer-only work.
export function profileHistory(data: Snapshot, memberId: string) {
  const permitted = data.findings.filter((f) => f.visibility === "members");
  const versions = data.versions.filter((v) =>
    permitted.some((f) => f.id === v.finding_id),
  );
  return {
    findings: permitted.filter((f) => f.author_id === memberId),
    reviews: data.decisions.flatMap((decision) => {
      const version = versions.find((v) => v.id === decision.version_id);
      const finding = permitted.find((f) => f.id === version?.finding_id);
      return version &&
        finding &&
        (finding.author_id === memberId || decision.reviewer_id === memberId)
        ? [{ decision, version, finding }]
        : [];
    }),
  };
}
export function credit(data: Snapshot) {
  if (data.personalCredit) return data.personalCredit;
  return {
    xp: data.awards.reduce((n, a) => n + a.xp, 0),
    points: data.awards
      .filter((a) => a.season === data.policy.season)
      .reduce((n, a) => n + a.points, 0),
  };
}

export function roomData(data: ResearchData): ResearchData {
  const findings = data.findings.filter(
    (f) => f.question_id === data.question.id,
  );
  const versions = data.versions.filter((v) =>
    findings.some((f) => f.id === v.finding_id),
  );
  return {
    ...data,
    findings,
    versions,
    messages: data.messages.filter((m) => m.question_id === data.question.id),
    uses: data.uses.filter((u) => versions.some((v) => v.id === u.version_id)),
    requests: data.requests.filter((r) => r.question_id === data.question.id),
    assignment:
      data.question.id === "testnet-readiness" ? data.assignment : null,
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
