import type { AlphaVersion, CheckedSource } from "./model";
export type PriorCandidate = {
  id: string;
  claim: string;
  addition: string;
  subject: string | null;
  contract: string | null;
  category: string | null;
  submitted_at: string;
  sources: unknown;
};
export type ReviewContext = {
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
export function deterministicChecks(
  context: ReviewContext,
  sources: CheckedSource[],
) {
  const checks = [
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
  for (const [field, value] of Object.entries(context.alpha.details))
    if (!value.trim()) checks.push(`Missing category context: ${field}.`);
  const candidates = context.candidates.map((p) => ({
    ...p,
    signals: [
      ...(normalize(p.claim) === normalize(context.version.claim)
        ? ["Exact normalized claim"]
        : []),
      ...(p.contract && p.contract === context.alpha.contract
        ? ["Same contract identifier"]
        : []),
      ...(p.subject && normalize(p.subject) === normalize(context.alpha.subject)
        ? ["Same declared subject"]
        : []),
      ...(context.alpha.evidence.some(
        (e) => e.kind === "link" && JSON.stringify(p.sources).includes(e.value),
      )
        ? ["Shared source"]
        : []),
    ],
  }));
  for (const s of sources)
    if (s.status === "unknown") checks.push(`${s.label}: Unknown.`);
  if (candidates.some((c) => c.signals.length))
    checks.push(
      "Possible prior work requires independent review; matching subjects/sources are not proof of copying.",
    );
  return {
    checks,
    candidates: candidates
      .sort((a, b) => b.signals.length - a.signals.length)
      .slice(0, 12),
  };
}
