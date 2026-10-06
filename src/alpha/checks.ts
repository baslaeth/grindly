import type { AlphaVersion, CheckedSource } from "./model";
import { categoryFields, reviewChecklist, unspecified } from "./checklists";
import type { AirdropGuide } from "./airdrop";
export type PriorCandidate = {
  id: string;
  claim: string;
  addition: string;
  subject: string | null;
  contract: string | null;
  category: string | null;
  submitted_at: string;
  sources: unknown;
  author_id?: string;
};
export type ReviewContext = {
  launchContext?: Record<string, string>;
  airdropGuide?: AirdropGuide;
  reviewedAt?: string;
  existing: boolean;
  run: string;
  isDemo: boolean;
  alpha: AlphaVersion;
  version: {
    id: string;
    claim: string;
    addition: string;
    limitations: string;
    submitted_at: string;
    finding_id: string;
  };
  candidates: PriorCandidate[];
  messages: { id: string; revision: string; body: string; createdAt: string }[];
};
const normalize = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
const sourceUrls = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.flatMap((s) =>
        s && typeof s === "object" && "url" in s && typeof s.url === "string"
          ? [s.url]
          : [],
      )
    : [];
export function deterministicChecks(
  context: ReviewContext,
  sources: CheckedSource[],
) {
  const checks = [
    "Shared sources and similar subjects are not proof of copying; prior-work hints require independent assessment.",
    `Server submission time: ${context.version.submitted_at}. First in Grindly is not first in the world.`,
    context.alpha.first_noticed
      ? "First noticed is self-reported and does not establish discovery priority."
      : "No self-reported observation time supplied.",
  ];
  if (context.alpha.source_created_at)
    checks.push(
      `Original linked message time: ${context.alpha.source_created_at}. Authorship remains with its original author.`,
    );
  if (context.alpha.horizon)
    checks.push(
      `Outcome remains pending until ${context.alpha.horizon}; initial evaluation is separate.`,
    );
  for (const field of categoryFields[context.alpha.category]) {
    const value = context.alpha.details[field.key];
    if (!value?.trim())
      checks.push(`Missing category context: ${field.label}.`);
    else if (unspecified(value))
      checks.push(
        `${field.label}: ${value}. This is not established evidence.`,
      );
  }
  if (context.alpha.contract && unspecified(context.alpha.contract))
    checks.push(
      "Asset identifier is Unknown. Asset-level verification cannot be inferred; inspect the provider-specific coverage below.",
    );
  checks.push(
    `Review checklist ${reviewChecklist(context.alpha.category, context.alpha.contribution_type).version}. Retrieved does not mean supported.`,
  );
  const candidates = context.candidates.map((p) => ({
    ...p,
    signals: [
      ...(normalize(p.claim) === normalize(context.version.claim)
        ? ["Exact normalized claim"]
        : []),
      ...(p.contract &&
      !unspecified(p.contract) &&
      (/^0x[\da-f]{40}$/i.test(p.contract) &&
      /^0x[\da-f]{40}$/i.test(context.alpha.contract)
        ? p.contract.toLowerCase() === context.alpha.contract.toLowerCase()
        : p.contract === context.alpha.contract)
        ? ["Same contract identifier"]
        : []),
      ...(p.subject && normalize(p.subject) === normalize(context.alpha.subject)
        ? ["Same declared subject"]
        : []),
      ...(context.alpha.evidence.some(
        (e) => e.kind === "link" && sourceUrls(p.sources).includes(e.value),
      )
        ? ["Shared source"]
        : []),
    ],
  }));
  for (const s of sources)
    if (s.status === "unknown") checks.push(`${s.label}: Unknown.`);
  return {
    checks,
    candidates: candidates
      .sort((a, b) => b.signals.length - a.signals.length)
      .slice(0, 12),
  };
}
