import type { LaunchCategory } from "./forms";

// Only equivalent questions share an answer. Existing distinct context stays editable.
const aliases: Partial<Record<LaunchCategory, Record<string, string>>> = {
  "Whitelist Hunters": {
    project: "subject",
    action: "usefulAction",
    cost: "costOrRisk",
  },
  "Presale Hunters": { downside: "costOrRisk" },
  "Project Analysts": { decision: "purpose", risk: "costOrRisk" },
  "Seed and Early Stage Investors": { opportunity: "subject" },
  "NFT Specialists": { collection: "subject", downside: "costOrRisk" },
  "Meta Catchers": { theme: "subject", whyNow: "purpose" },
};
export function formAliases(
  category: LaunchCategory,
  existing?: Record<string, string>,
  answers?: Record<string, string>,
): Record<string, string> {
  return Object.fromEntries(
    Object.entries(aliases[category] ?? {}).filter(
      ([key, field]) =>
        !existing || !existing[key] || existing[key] === answers?.[field],
    ),
  );
}
export function submissionTypes(revising: boolean) {
  return revising
    ? (["correction", "update"] as const)
    : (["find", "guide", "warning", "prediction"] as const);
}
