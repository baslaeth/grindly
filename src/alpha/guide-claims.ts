import type { ReviewContext } from "./checks";
import type { CheckedSource, ReviewCard } from "./model";

export const guideAssessmentVersion = "2026-10-07.1";
export type GuideClaim = { text: string; field: string; original: string };

function personalExecution(text: string, field?: string) {
  return (
    field === "tested" ||
    /\b(?:I|we|my wallet|our wallet|your wallet|you)\s+(?:am |are |have |has |did |not |never |personally |successfully )*(?:eligible|qualified|qualify|received|claimed|tested|executed|completed|deposited|earned|perform)\b|\b(?:no|without)\s+(?:personal |actual )?(?:wallet (?:actions?|activity)|transactions?|personal execution)\b|\b(?:wallet actions?|transactions?|steps?)\s+(?:were |was |have been )?(?:not )?(?:performed|tested|executed)\b/i.test(
      text,
    )
  );
}

// Split only explicit clause boundaries, retaining the unchanged source field.
// This is bounded syntactic coverage, not a claim of semantic extraction accuracy.
export function guideClaims(context: ReviewContext): GuideClaim[] {
  const fields: [string, string | undefined][] = [
    ["finding", context.version.claim],
    ...Object.entries(context.airdropGuide ?? {}).filter(
      ([k]) => !["version", "official", "stage"].includes(k),
    ),
    ...Object.entries(context.launchContext ?? {}).filter(
      ([k]) => !["project", "network", "status"].includes(k),
    ),
    ["personalAddition", context.version.addition],
    ["limitations", context.version.limitations],
  ];
  const claims: GuideClaim[] = [];
  for (const [field, original] of fields) {
    if (
      !original ||
      /^(unknown|not applicable|none|not tested)[.!]?$/i.test(original)
    )
      continue;
    const parts = original.split(
      /(?<=[.!?])\s+(?=[A-Z0-9])|[;\n]+|\s+(?:and|but|while|however)\s+(?=(?:I|we|you|everyone|all|it|the|this|that|rewards?|tokens?|points?|claims?|eligibility|no|there)\b)/i,
    );
    for (const part of parts) {
      const text = part.trim().replace(/^[-*]\s+|^\d+[.)]\s+/, "");
      if (text.length < 5 || /^(unknown|not applicable)[.!]?$/i.test(text))
        continue;
      if (!claims.some((c) => c.text === text))
        claims.push({ text, field, original });
    }
  }
  return claims;
}

export function guardGuideCard(
  card: ReviewCard,
  context: ReviewContext,
  sources: CheckedSource[] = [],
) {
  const origins = guideClaims(context);
  for (const claim of card.claims) {
    const origin = origins.find((c) => c.text === claim.claim);
    claim.field = origin?.field;
    claim.original = origin?.original;
    claim.campaign = context.alpha.subject;
    claim.assessedAt = context.reviewedAt ?? null;
    // This adapter has no authenticated wallet/execution or live claim observation.
    // Official prose is categorically insufficient for these particular assertions.
    const personal = personalExecution(claim.claim, claim.field);
    const current =
      /\b(?:claim|portal|campaign)\b.{0,50}\b(?:open|active|working|available|live)\s+(?:now|today|currently)\b|\bcurrently\s+(?:open|active|available)\b/i.test(
        claim.claim,
      );
    if (claim.status === "supported" && (personal || current)) {
      claim.status = "unverified";
      claim.reason = personal
        ? "Unknown: official instructions do not establish this person's eligibility, receipt or execution. Wallet-specific evidence has not been inspected."
        : "Unknown: a dated announcement or retrieved page does not establish current claim availability. No live availability observation was made.";
    }
    const quote = claim.evidenceLinks.map((l) => l.excerpt).join(" ");
    if (
      current &&
      claim.status === "contradicted" &&
      !/discontinued|no longer available|claim.{0,30}(?:closed|unavailable)|closed.{0,30}claim/i.test(
        quote,
      )
    ) {
      claim.status = "unverified";
      claim.reason =
        "Unknown: the cited passage does not establish closure or current unavailability. Past distribution is not a live availability check.";
    }
    if (
      /^ignore\b.*\b(?:instructions|evidence|rules)\b|\b(?:award|grant)\s+\d+\s+(?:Grindly\s+)?XP\b/i.test(
        claim.claim,
      )
    ) {
      claim.status = "unverified";
      claim.reason =
        "Unknown: this is an untrusted instruction, not evidence of a program fact. It cannot change review authority or award XP.";
    }
    const missingFacet = [
      [/referr|invitee/i, /referr|invitee/i],
      [/inactive|signing up/i, /inactive|never complete|headcount|signing up/i],
      [/two.week/i, /two.week|2.week|14.day/i],
      [/desktop|laptop/i, /desktop|laptop/i],
      [/Portfolio/i, /Portfolio/i],
    ].some(
      ([claimPattern, quotePattern]) =>
        claimPattern!.test(claim.claim) && !quotePattern!.test(quote),
    );
    if (claim.status === "supported" && missingFacet) {
      claim.status = "unverified";
      claim.reason =
        "Unknown: the quotation does not establish the referral condition or exact period asserted here. Inspect the relevant official section; a related heading is insufficient.";
    }
    const numberWords = [
      "zero",
      "one",
      "two",
      "three",
      "four",
      "five",
      "six",
      "seven",
      "eight",
      "nine",
      "ten",
    ];
    const numericClaim = claim.claim
      .toLowerCase()
      .replace(
        /\b(zero|one|two|three|four|five|six|seven|eight|nine|ten)\b/g,
        (word) => String(numberWords.indexOf(word)),
      );
    const statedCap = quote.match(
      /caps? (?:each )?task at (\d+) completions per account/i,
    )?.[1];
    if (
      claim.status === "contradicted" &&
      statedCap &&
      new RegExp(
        `describes ${statedCap} completions per task per account`,
        "i",
      ).test(numericClaim)
    ) {
      claim.status = "unverified";
      claim.reason = `Awaiting assessment: the source states a cap of ${statedCap} completions per account. This does not establish a conflicting number; clarify that this is a maximum, not a requirement.`;
    }
    const closureDate =
      /discontinu|clos(?:ed|ure)/i.test(claim.claim) &&
      /\b20\d\d\b|\bdate\b/i.test(claim.claim);
    const missingClosureDate =
      closureDate &&
      !quote
        .split(/(?<=[.!?])\s+/)
        .some(
          (s) => /discontinu|clos(?:ed|ure)/i.test(s) && /\b20\d\d\b/.test(s),
        );
    const missingPublication =
      /publish|publication/i.test(claim.claim) &&
      !claim.evidenceLinks.some(
        (l) => sources.find((s) => s.id === l.source)?.publishedAt,
      );
    const depositClaim = /deposit|minimum balance|lockup/i.test(claim.claim);
    const missingCost =
      depositClaim && !/deposit|minimum balance|lockup/i.test(quote);
    const overbroad =
      /\b(?:every|all)\b.{0,40}\bprograms?\b/i.test(claim.claim) &&
      !/\b(?:every|all)\b.{0,40}\bprograms?\b/i.test(quote);
    if (
      claim.status === "contradicted" &&
      /scheduled|announced opening/i.test(claim.claim) &&
      /discontinued/i.test(quote) &&
      !/starting|opens|opening|scheduled/i.test(quote)
    ) {
      claim.status = "unverified";
      claim.reason =
        "Unknown: the cited closure notice does not contradict a historical scheduled opening. Inspect the original opening announcement.";
    }
    if (
      (claim.status === "supported" && (missingPublication || missingCost)) ||
      (claim.status !== "unverified" && missingClosureDate) ||
      (claim.status !== "unverified" && overbroad)
    ) {
      claim.status = "unverified";
      claim.reason = missingCost
        ? "Unknown: the cited passage does not establish this deposit, balance or lockup requirement. Fee coverage is a separate fact."
        : overbroad
          ? "Unknown: evidence about one named campaign does not establish the status of every program from this project."
          : "Unknown: the cited evidence does not establish this kind of date. Publication, snapshot, opening and closure dates are not interchangeable.";
    }
  }
  card.assessmentVersion = guideAssessmentVersion;
  // Free-form model prose remains in the stored card for inspection, never the overview.
  return card;
}

export function guideOverview(card: ReviewCard | null | undefined) {
  if (
    !card ||
    ![guideAssessmentVersion, "2026-10-06.3"].includes(
      card.assessmentVersion ?? "",
    )
  )
    return null;
  return {
    supported: card.claims
      .filter(
        (c) =>
          c.status === "supported" &&
          !personalExecution(c.claim, c.field) &&
          !/Codex.authored|Controlled example|no personal execution is claimed/i.test(
            c.claim,
          ),
      )
      .sort(
        (a, b) =>
          Number(["finding", "personalAddition"].includes(a.field ?? "")) -
          Number(["finding", "personalAddition"].includes(b.field ?? "")),
      ),
    attention: card.claims.filter((c) => c.status !== "supported"),
    next: card.claims.some((c) => c.status !== "supported")
      ? "Check the claims marked Unknown or conflicting against the linked official passages; add missing dated evidence before relying on them."
      : "Read the official steps and exclusions before participating. Personal eligibility and execution still need your own evidence.",
  };
}

export type CampaignDateFact = {
  kind:
    | "publication"
    | "retrieval"
    | "snapshot"
    | "opening"
    | "deadline"
    | "availability"
    | "closure";
  value: string | null;
  passage: string | null;
  source: string;
  limitation: string;
};
export function campaignDates(source: CheckedSource): CampaignDateFact[] {
  let passages: string[] = [];
  try {
    passages = (JSON.parse(source.facts).passages ?? []).map(
      (p: { text: string }) => p.text,
    );
  } catch {
    /* Older snapshot. */
  }
  const event = (
    kind: CampaignDateFact["kind"],
    pattern: RegExp,
  ): CampaignDateFact => {
    const passage =
      passages
        .flatMap((p) => p.split(/(?<=[.!?])\s+/))
        .find((p) => pattern.test(p)) ?? null;
    // Only a single explicitly zoned instant with the named role is unambiguous.
    const dates =
      passage?.match(
        /\b20\d\d-\d\d-\d\dT\d\d:\d\d(?::\d\d)?(?:Z|[+-]\d\d:\d\d)\b/g,
      ) ?? [];
    const value =
      dates.length === 1 && Number.isFinite(Date.parse(dates[0]))
        ? new Date(dates[0]).toISOString()
        : null;
    return {
      kind,
      value,
      passage,
      source: source.id,
      limitation: value
        ? "Publisher-stated time, not observed execution."
        : "Unknown date: no unambiguous zoned instant. A different date must not be substituted.",
    };
  };
  return [
    {
      kind: "publication",
      value: source.publishedAt,
      passage: null,
      source: source.id,
      limitation: "Publisher metadata, not an event date.",
    },
    {
      kind: "retrieval",
      value: source.checkedAt,
      passage: null,
      source: source.id,
      limitation: "Fetch time only; not campaign status.",
    },
    event("snapshot", /snapshot/i),
    event("opening", /claim.{0,40}(?:open|start)|available.{0,30}claim/i),
    event("deadline", /deadline|claim.{0,40}(?:until|expire|ends)/i),
    {
      kind: "availability",
      value: null,
      passage: null,
      source: source.id,
      limitation: "No direct availability observation.",
    },
    event("closure", /discontinued|no longer available|campaign.{0,20}closed/i),
  ];
}

export function calendarDeadline(start: string, months: number): string | null {
  if (
    !/T.*(?:Z|[+-]\d\d:\d\d)$/.test(start) ||
    !Number.isInteger(months) ||
    months < 1 ||
    months > 120
  )
    return null;
  const date = new Date(start);
  if (!Number.isFinite(date.getTime())) return null;
  const day = date.getUTCDate();
  date.setUTCDate(1);
  date.setUTCMonth(date.getUTCMonth() + months);
  const end = new Date(date);
  end.setUTCMonth(end.getUTCMonth() + 1, 0);
  date.setUTCDate(Math.min(day, end.getUTCDate()));
  return date.toISOString();
}
