import { categories } from "../research/spaces";

export const checklistVersion = "2026-09-30.2";
export const assessmentFields = [
  { key: "evidence", label: "Evidence and dated sources" },
  { key: "relevance", label: "Relevance to members" },
  { key: "addition", label: "Personal contribution and prior work" },
  { key: "limitations", label: "Limitations and uncertainty" },
  { key: "alternatives", label: "Competing explanations" },
] as const;
export type Category = (typeof categories)[number];
export type ContributionType =
  "find" | "guide" | "analysis" | "prediction" | "warning" | "update" | "correction" | "followup";
type ContextField = {
  key: string;
  label: string;
  kind?: "date" | "url";
  question: string;
};
export const categoryFields: Record<Category, ContextField[]> = {
  "Whitelist Hunters": [
    {
      key: "official",
      label: "Official announcement",
      kind: "url",
      question:
        "Does the official announcement actually confirm the opportunity?",
    },
    {
      key: "eligibility",
      label: "Eligibility and exclusions",
      question: "Which members qualify, and what would exclude them?",
    },
    {
      key: "steps",
      label: "Steps to participate",
      question: "Are the steps documented and the destination authentic?",
    },
    {
      key: "deadline",
      label: "Application deadline (UTC)",
      kind: "date",
      question: "Is the dated announcement still current?",
    },
  ],
  "Airdrop Hunters": [
    {
      key: "protocol",
      label: "Protocol and chain",
      question: "Is the protocol and network unambiguous?",
    },
    {
      key: "actions",
      label: "Qualifying actions",
      question: "Which actions are confirmed rather than rumored?",
    },
    {
      key: "status",
      label: "Snapshot or campaign status",
      question: "Is a snapshot or campaign official, pending, or unknown?",
    },
    {
      key: "costs",
      label: "Costs and uncertainty",
      question:
        "What fees, exclusions and uncertain reward assumptions remain?",
    },
  ],
  "Presale Hunters": [
    {
      key: "terms",
      label: "Official terms",
      kind: "url",
      question: "Do the public terms support the stated offer?",
    },
    {
      key: "window",
      label: "Sale window",
      question: "What dated window applies, and is it still open?",
    },
    {
      key: "eligibility",
      label: "Eligibility",
      question: "What restrictions apply without promising an allocation?",
    },
    {
      key: "vesting",
      label: "Vesting, unlocks and risks",
      question: "Which unlocks and material risks are known or missing?",
    },
  ],
  Degens: [
    {
      key: "catalyst",
      label: "Catalyst",
      question: "Is the catalyst observable or only speculation?",
    },
    {
      key: "observations",
      label: "Dated liquidity and holder observations",
      question:
        "At which time, venue and block were liquidity and holders observed?",
    },
    {
      key: "risks",
      label: "Contract and liquidity risks",
      question:
        "What has not been checked, including privileged controls and exit liquidity?",
    },
    {
      key: "position",
      label: "Position disclosure",
      question: "What exposure or conflicts has the contributor disclosed?",
    },
  ],
  Traders: [
    {
      key: "setup",
      label: "Asset and setup",
      question:
        "Does the setup refer to a defined asset, venue and observation?",
    },
    {
      key: "data",
      label: "Timestamped chart or data context",
      question:
        "Do the data date and interval match this claim, rather than a later spot quote?",
    },
    {
      key: "risk",
      label: "Risk and invalidation",
      question:
        "What would count against the setup and what alternative explains it?",
    },
    {
      key: "position",
      label: "Position disclosure",
      question: "What exposure or conflicts has the contributor disclosed?",
    },
  ],
  "Project Analysts": [
    {
      key: "thesis",
      label: "Project thesis and product",
      question:
        "Is the thesis supported by a functioning product or only documentation?",
    },
    {
      key: "team",
      label: "Team and traction evidence",
      question:
        "What independently observed evidence exists beyond the project's own claims?",
    },
    {
      key: "counter",
      label: "Counterarguments and open questions",
      question:
        "Which competing explanations and unknowns could change the thesis?",
    },
  ],
  "Seed and Early Stage Investors": [
    {
      key: "thesis",
      label: "Company and thesis",
      question: "What is the public, evidence-backed investment thesis?",
    },
    {
      key: "terms",
      label: "Available public terms",
      question:
        "Which terms are public, uncertain or unavailable? No allocation is promised.",
    },
    {
      key: "diligence",
      label: "Diligence and risks",
      question: "What was checked independently and what remains unverified?",
    },
    {
      key: "milestones",
      label: "Milestones",
      question: "Which dated milestones could test the thesis later?",
    },
  ],
  "NFT Specialists": [
    {
      key: "mint",
      label: "Mint terms and supply",
      question: "Are the mint terms and supply official and dated?",
    },
    {
      key: "rights",
      label: "Utility or rights",
      question: "Are rights documented, implemented, or merely promised?",
    },
    {
      key: "market",
      label: "Dated market evidence and risks",
      question:
        "What venue/time supports market observations, and what liquidity or concentration gaps remain?",
    },
  ],
  "Meta Catchers": [
    {
      key: "pattern",
      label: "Emerging pattern and examples",
      question:
        "Are there distinct examples rather than repeated claims from one source?",
    },
    {
      key: "signals",
      label: "Dated early signals",
      question: "Which early signals predate the claimed pattern?",
    },
    {
      key: "horizon",
      label: "Expected horizon",
      question: "When could the pattern be meaningfully reassessed?",
    },
    {
      key: "disprove",
      label: "What would disprove it?",
      question:
        "Which observations would weaken this pattern or favor an alternative?",
    },
  ],
};
export const commonReviewQuestions = [
  "Evidence: which exact claim does each dated source establish, and which claims remain Unknown?",
  "Relevance: how does this help permitted members make a better-informed decision?",
  "Personal contribution: what did this author discover, test or add beyond the sources and prior work?",
  "Limitations: distinguish missing evidence from contradicting evidence; disclose conflicts and uncertainty.",
  "Competing explanations: what alternative could explain the same observations?",
];
const typeQuestions: Record<ContributionType, string[]> = {
  find: [
    "Is the discovery actually new to this discussion? First in Grindly is not first in the world.",
  ],
  analysis: [
    "Can another member follow the method? Do not judge a guide by subsequent price.",
  ],
  guide: ["Are the steps actually tested, dated and usable at the stated cost?"],
  prediction: [
    "Were subject, horizon and falsification criteria saved before the outcome? Initial acceptance is not forecast success.",
  ],
  warning: [
    "Is the warning proportionate to dated evidence, with uncertainty rather than an unsupported accusation?",
  ],
  update: ["What materially changed from the linked earlier work, and when was it confirmed?"],
  correction: [
    "What changed from the original version, and are its source history and contrary evidence preserved?",
  ],
  followup: [
    "What new dated evidence was added? Do not retroactively change the original claim or criteria.",
  ],
};
export function reviewChecklist(category: Category, type: ContributionType) {
  return {
    version: checklistVersion,
    questions: [
      ...commonReviewQuestions,
      ...categoryFields[category].map((f) => f.question),
      ...typeQuestions[type],
    ],
  };
}
export function unspecified(value: string) {
  return /^(unknown|not applicable)$/i.test(value.trim());
}
export function contextIssues(
  category: Category,
  details: Record<string, string>,
) {
  return categoryFields[category].flatMap((f) => {
    const v = details[f.key]?.trim();
    if (!v)
      return [
        {
          key: f.key,
          message: `${f.label}: provide context, Unknown or Not applicable.`,
        },
      ];
    if (unspecified(v)) return [];
    if (f.kind === "url") {
      try {
        const u = new URL(v);
        if (u.protocol === "https:" && !u.username && !u.password) return [];
      } catch {
        /* Validated below. */
      }
      return [
        {
          key: f.key,
          message: `${f.label}: use an HTTPS reference or Unknown.`,
        },
      ];
    }
    if (
      f.kind === "date" &&
      (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})$/.test(
        v,
      ) ||
        !Number.isFinite(Date.parse(v)))
    )
      return [
        {
          key: f.key,
          message: `${f.label}: use a dated UTC value, Unknown or Not applicable.`,
        },
      ];
    return [];
  });
}
export function primaryFocus(profile?: {
  primary_focus?: string | null;
  interest?: string | null;
  specialty?: string | null;
}) {
  if (profile && "primary_focus" in profile)
    return categories.includes(profile.primary_focus as Category)
      ? profile.primary_focus!
      : null;
  // The original database default was Project Analysts, with no selection audit.
  // Non-default interests are explicit; an ambiguous default requires confirmation.
  return profile?.interest !== "Project Analysts" &&
    categories.includes(profile?.interest as Category)
    ? profile!.interest!
    : categories.includes(profile?.specialty as Category)
      ? profile!.specialty!
      : null;
}
