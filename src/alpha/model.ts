import { z } from "zod";
import { categories } from "@/research/spaces";
import { categoryFields, contextIssues, checklistVersion } from "./checklists";

export const alphaCategories = categories;
export type AlphaCategory = (typeof categories)[number];
export const contributionTypes = {
  find: "New find",
  analysis: "Analysis or guide",
  prediction: "Prediction or call",
  warning: "Warning",
  correction: "Correction",
  followup: "Follow-up",
} as const;
export const categoryPrompts: Record<AlphaCategory, string[]> = {
  "Whitelist Hunters": [
    "Project and official source",
    "Eligibility and exclusions",
    "Deadline and steps",
  ],
  "Airdrop Hunters": [
    "Protocol and chain",
    "Qualifying actions or snapshot",
    "Deadline, costs and uncertainty",
  ],
  "Presale Hunters": [
    "Official terms and window",
    "Eligibility",
    "Vesting, unlocks and material risks",
  ],
  Degens: [
    "Chain and contract",
    "Catalyst and observation context",
    "Liquidity, holder and contract risks",
    "Position disclosure",
  ],
  Traders: [
    "Asset and setup",
    "Time horizon and invalidation",
    "Risk and timestamped chart or data",
    "Position disclosure",
  ],
  "Project Analysts": [
    "Project, thesis and product",
    "Team and traction evidence",
    "Counterarguments and open questions",
  ],
  "Seed and Early Stage Investors": [
    "Company and thesis",
    "Public terms and diligence",
    "Milestones and risks (no allocation promise)",
  ],
  "NFT Specialists": [
    "Collection and contract",
    "Mint terms and supply",
    "Utility or rights, market evidence and risks",
  ],
  "Meta Catchers": [
    "Emerging pattern and examples",
    "Early signals and expected horizon",
    "What would disprove the pattern",
  ],
};
const text = (min: number, max: number) => z.string().trim().min(min).max(max);
export const alphaEvidence = z.discriminatedUnion("kind", [
  z
    .object({
      kind: z.literal("link"),
      value: z
        .url()
        .max(500)
        .refine((v) => /^https:\/\//.test(v)),
      label: text(1, 120),
    })
    .strict(),
  z
    .object({
      kind: z.literal("transaction"),
      value: z.string().regex(/^0x[0-9a-fA-F]{64}$/),
      label: text(1, 120),
    })
    .strict(),
  z
    .object({
      kind: z.literal("attachment"),
      value: z.uuid(),
      label: text(1, 120),
    })
    .strict(),
  z
    .object({
      kind: z.literal("message"),
      value: z.uuid(),
      revision: z.uuid(),
      label: text(1, 120),
    })
    .strict(),
]);
export const alphaSubmission = z
  .object({
    action: z.literal("submit"),
    request: z.uuid(),
    finding: z.uuid().nullable(),
    previous: z.uuid().nullable(),
    category: z.enum(categories),
    type: z.enum(
      Object.keys(contributionTypes) as [
        keyof typeof contributionTypes,
        ...(keyof typeof contributionTypes)[],
      ],
    ),
    visibility: z.enum(["members", "reviewers"]),
    claim: text(10, 1000),
    purpose: text(5, 1000),
    addition: text(10, 2000),
    limitations: text(5, 1000),
    evidence: z.array(alphaEvidence).min(1).max(8),
    subject: text(2, 120),
    chain: z.string().max(40),
    contract: z.string().trim().max(160),
    details: z
      .record(z.string().max(100), z.string().max(1000))
      .refine((v) => Object.keys(v).length <= 8),
    checklist: z.literal(checklistVersion).default(checklistVersion),
    firstNoticed: z.iso
      .datetime({ offset: true })
      .nullable()
      .refine((v) => !v || Date.parse(v) <= Date.now() + 60000),
    horizon: z.iso.datetime({ offset: true }).nullable(),
    checkCondition: z.string().trim().max(1000),
    sourceMessage: z.uuid().nullable(),
    sourceRevision: z.uuid().nullable(),
    relatedVersion: z.uuid().nullable(),
    correction: text(10, 1000).nullable(),
  })
  .strict()
  .superRefine((v, c) => {
    if (v.type === "prediction" && (!v.horizon || v.checkCondition.length < 10))
      c.addIssue({
        code: "custom",
        message:
          "Predictions need a horizon and an invalidation/check condition",
        path: ["horizon"],
      });
    if (v.horizon && !v.previous && Date.parse(v.horizon) <= Date.now())
      c.addIssue({
        code: "custom",
        message: "A new horizon must be in the future",
        path: ["horizon"],
      });
    if (!!v.sourceMessage !== !!v.sourceRevision)
      c.addIssue({
        code: "custom",
        message: "Source version required",
        path: ["sourceRevision"],
      });
    if (
      Object.keys(v.details).some(
        (k) => !categoryFields[v.category].some((f) => f.key === k),
      )
    )
      c.addIssue({
        code: "custom",
        message: "Use the selected category's fields",
        path: ["details"],
      });
    for (const issue of contextIssues(v.category, v.details))
      c.addIssue({
        code: "custom",
        message: issue.message,
        path: ["details", issue.key],
      });
    if (
      (v.contract ||
        ["Degens", "NFT Specialists", "Airdrop Hunters"].includes(
          v.category,
        )) &&
      !v.chain.trim()
    )
      c.addIssue({
        code: "custom",
        message: "State the chain, Unknown or Not applicable.",
        path: ["chain"],
      });
    if (["Degens", "NFT Specialists"].includes(v.category) && !v.contract)
      c.addIssue({
        code: "custom",
        message: "State the asset identifier, Unknown or Not applicable.",
        path: ["contract"],
      });
  });
export type AlphaSubmission = z.infer<typeof alphaSubmission>;
export const outcomeAssessment = z
  .object({
    action: z.literal("outcomeAssess"),
    version: z.uuid(),
    request: z.uuid(),
    status: z.enum(["known", "mixed", "inconclusive", "pending"]),
    relation: z.enum(["met", "not_met", "mixed", "unknown"]),
    facts: text(10, 3000),
    explanation: text(20, 3000),
    uncertainty: text(5, 1500),
    observedAt: z.iso
      .datetime({ offset: true })
      .refine((v) => Date.parse(v) <= Date.now() + 60000),
    sources: z
      .array(
        z
          .object({
            url: z
              .url()
              .max(500)
              .refine((v) => {
                const u = new URL(v);
                return u.protocol === "https:" && !u.username && !u.password;
              }),
            label: text(1, 120),
            publishedAt: z.iso.datetime({ offset: true }).nullable(),
          })
          .strict(),
      )
      .min(1)
      .max(8),
    conflicts: text(4, 500),
    conflictFree: z.literal(true),
  })
  .strict()
  .superRefine((v, c) => {
    if (
      !(v.status === "known" && ["met", "not_met"].includes(v.relation)) &&
      !(v.status === "mixed" && v.relation === "mixed") &&
      !(
        ["pending", "inconclusive"].includes(v.status) &&
        v.relation === "unknown"
      )
    )
      c.addIssue({
        code: "custom",
        message:
          "Outcome status must match the stated relationship to the criteria.",
        path: ["relation"],
      });
  });
export type Evidence = z.infer<typeof alphaEvidence>;
export type AlphaVersion = {
  version_id: string;
  category: AlphaCategory;
  contribution_type: keyof typeof contributionTypes;
  purpose: string;
  subject: string;
  chain: string;
  contract: string;
  details: Record<string, string>;
  evidence: Evidence[];
  first_noticed: string | null;
  horizon: string | null;
  check_condition: string;
  source_created_at: string | null;
  created_at: string;
};
export const reviewCardSchema = z
  .object({
    summary: z.string().max(1500),
    claims: z
      .array(
        z
          .object({
            claim: z.string().max(1000),
            status: z.enum(["supported", "contradicted", "unverified"]),
            reason: z.string().max(1200),
            sources: z.array(z.string().max(80)).max(8),
            evidenceLinks: z
              .array(
                z
                  .object({
                    source: z.string().max(80),
                    excerpt: z.string().min(10).max(1200),
                    relationship: z.string().min(20).max(1200),
                    sourceDate: z.string().nullable(),
                  })
                  .strict(),
              )
              .max(8),
          })
          .strict(),
      )
      .min(1)
      .max(12),
    missingEvidence: z.array(z.string().max(500)).max(12),
    riskQuestions: z.array(z.string().max(500)).max(12),
    priorWork: z
      .array(
        z
          .object({
            version: z.uuid(),
            reason: z.string().max(800),
            relationship: z.enum([
              "possible_derivative",
              "shared_source",
              "independent_evidence",
            ]),
          })
          .strict(),
      )
      .max(12),
    nextCheck: z.string().max(500),
  })
  .strict();
export type ReviewCard = z.infer<typeof reviewCardSchema>;
export type CheckedSource = {
  id: string;
  label: string;
  url: string | null;
  checkedAt: string;
  publishedAt: string | null;
  status: "retrieved" | "unknown";
  facts: string;
  digest: string | null;
};
export type PreliminaryRun = {
  id: string;
  version_id: string;
  status: string;
  error_code: string | null;
  provider: string | null;
  model: string | null;
  card: ReviewCard | null;
  sources: CheckedSource[];
  checks: string[];
  created_at: string;
  completed_at: string | null;
};
export type AlphaOutcome = {
  id: string;
  version_id: string;
  status: "known" | "mixed" | "inconclusive" | "pending";
  facts: string;
  sources: CheckedSource[];
  checked_at: string;
  actor_id: string;
};
export type AlphaSnapshot = {
  serverTime: string;
  evaluationAvailable?: boolean;
  reviewAssessments?: {
    decision_id: string;
    checklist: string;
    assessment: Record<string, string>;
    created_at: string;
  }[];
  checklistVersions?: { version_id: string; checklist: string }[];
  sourceChecks?: {
    id: string;
    version_id: string;
    status: string;
    sources: CheckedSource[];
    checks: string[];
    hints: { version: string; signals: string[] }[];
    created_at: string;
    completed_at: string | null;
  }[];
  outcomeAssessments?: {
    id: string;
    version_id: string;
    actor_id: string;
    status: string;
    relation: "met" | "not_met" | "mixed" | "unknown";
    facts: string;
    explanation: string;
    uncertainty: string;
    observed_at: string;
    recorded_at: string;
    sources: { url: string; label: string; publishedAt: string | null }[];
  }[];
  outcomeReviewable?: string[];
  alphaFeedback: {
    id: string;
    version_id: string;
    member_id: string;
    kind: string;
    detail: string;
    source: string;
    created_at: string;
  }[];
  alphas: AlphaVersion[];
  preliminary: PreliminaryRun[];
  outcomes: AlphaOutcome[];
  creditStates: { version_id: string; status: string }[];
};

export function categoryRecord(
  data: {
    findings: {
      id: string;
      author_id: string;
      current_version: string | null;
      status: string;
    }[];
    versions: { id: string; finding_id: string; version: number }[];
    decisions?: { version_id: string }[];
  } & Partial<AlphaSnapshot>,
  member: string,
) {
  return alphaCategories.map((category) => {
    const records = data.findings.filter(
      (f) =>
        f.author_id === member &&
        data.alphas?.some(
          (a) => a.version_id === f.current_version && a.category === category,
        ),
    );
    const count = (status: string) =>
      records.filter((f) => f.status === status).length;
    return {
      category,
      total: records.length,
      pending: count("pending"),
      reviewed: records.filter(
        (f) =>
          ["accepted", "needs_correction", "rejected"].includes(f.status) ||
          data.decisions?.some((d) =>
            data.versions.some(
              (v) => v.id === d.version_id && v.finding_id === f.id,
            ),
          ),
      ).length,
      accepted: count("accepted"),
      corrected: records.filter((f) =>
        data.versions.some((v) => v.finding_id === f.id && v.version > 1),
      ).length,
      outcomeKnown: records.filter((f) =>
        data.versions.some(
          (v) =>
            v.finding_id === f.id &&
            (data.outcomeAssessments
              ?.filter((o) => o.version_id === v.id)
              .sort((a, b) => b.recorded_at.localeCompare(a.recorded_at))[0]
              ?.status ??
              data.outcomes
                ?.filter((o) => o.version_id === v.id)
                .sort((a, b) => b.checked_at.localeCompare(a.checked_at))[0]
                ?.status) === "known",
        ),
      ).length,
      records,
    };
  });
}
