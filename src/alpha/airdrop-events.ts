export const airdropAlertTypes = [
  "announcement",
  "eligibility",
  "claim_open",
  "deadline",
  "requirements",
] as const;
export type AirdropAlertType = (typeof airdropAlertTypes)[number];
export const airdropAlertLabels: Record<AirdropAlertType, string> = {
  announcement: "Token or airdrop announcement",
  eligibility: "Eligibility rules or checker",
  claim_open: "Claim opening",
  deadline: "Claim deadline",
  requirements: "Material participation requirements",
};
export type AirdropEventCandidate = {
  type: AirdropAlertType;
  passage: string;
  scheduledAt: string | null;
  availability: "announced" | "observed" | "unknown";
  action: string;
};
const normalize = (s: string) =>
  s
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[\u2018\u2019]/g, "'")
    .trim();
// Candidate extraction is deterministic triage, never event confirmation or a model answer.
export function airdropEventCandidates(
  passages: string[],
  previous: string[],
  project: string,
): AirdropEventCandidate[] {
  const prior = new Set(previous.map(normalize));
  return passages
    .filter((p) => !prior.has(normalize(p)))
    .flatMap((p) => {
      if (
        !/claim|airdrop|eligib|snapshot|deadline|lockup|required|exclud|provisions|token.{0,60}announc|announc.{0,60}token/i.test(
          p,
        )
      )
        return [];
      if (
        !new RegExp(project.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i").test(
          p,
        ) &&
        !/claim|eligib|deadline|provision/i.test(p)
      )
        return [];
      const opening =
        /claim.*(?:open|available|live|start)|available.{0,40}claim/i.test(p) &&
        !/no.{0,15}claim|claim.{0,25}(?:not |unavailable|closed)|not.{0,15}(?:open|available)/i.test(
          p,
        );
      const type: AirdropAlertType =
        /deadline|no later than|claim.*(?:until|ends|close|expire)|discontinued/i.test(
          p,
        )
          ? "deadline"
          : opening
            ? "claim_open"
            : /eligib|snapshot|checker/i.test(p)
              ? "eligibility"
              : /airdrop|token.*announc|announc.*token/i.test(p)
                ? "announcement"
                : "requirements";
      const role =
        type === "claim_open"
          ? /claim.{0,40}(?:open|start|available)/i
          : type === "deadline"
            ? /deadline|claim.{0,40}(?:until|ends|close|expire)/i
            : /snapshot/i;
      const datedClause = p
        .split(/(?<=[.!?])\s+/)
        .filter(
          (sentence) =>
            role.test(sentence) &&
            !/publication|published|discontinued/i.test(sentence),
        );
      const dates =
        datedClause.length === 1
          ? (datedClause[0]!.match(
              /\b20\d\d-\d\d-\d\dT\d\d:\d\d(?::\d\d)?Z\b/g,
            ) ?? [])
          : [];
      const rawDate = dates.length === 1 ? dates[0] : null;
      const scheduledAt =
        rawDate && Number.isFinite(Date.parse(rawDate))
          ? new Date(rawDate).toISOString()
          : null;
      return [
        {
          type,
          passage: p.slice(0, 1200),
          scheduledAt,
          availability: "announced" as const,
          action:
            type === "claim_open"
              ? "Check the official opening time and current availability before acting."
              : "Review the changed official requirements before continuing.",
        },
      ];
    })
    .slice(0, 8);
}
