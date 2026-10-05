import { categories } from "@/research/spaces";

export type LaunchField = { key: string; label: string; kind?: "url" | "date" | "number"; core?: boolean; fromPrediction?: boolean; options?: readonly string[] };
export type LaunchCategory = (typeof categories)[number];
export const launchFields: Record<LaunchCategory, LaunchField[]> = {
  "Whitelist Hunters": [
    { key: "project", label: "Project", core: true }, { key: "official", label: "Official link", kind: "url", core: true },
    { key: "eligibility", label: "Who can qualify", core: true }, { key: "action", label: "Required action", core: true },
    { key: "cost", label: "Cost" }, { key: "deadline", label: "Deadline (UTC)", kind: "date" }, { key: "routeEvidence", label: "Evidence the access route works" },
  ],
  "Airdrop Hunters": [
    { key: "project", label: "Project", core: true }, { key: "network", label: "Network", core: true },
    { key: "status", label: "Confirmed or speculative", core: true, options: ["Confirmed", "Speculative"] }, { key: "testedSteps", label: "Steps you actually tested", core: true },
    { key: "costs", label: "Fees and lockups" }, { key: "eligibility", label: "Known eligibility" }, { key: "checkpoint", label: "Next checkpoint or deadline", kind: "date" },
  ],
  "Presale Hunters": [
    { key: "official", label: "Official sale link", kind: "url", core: true }, { key: "terms", label: "Published terms", core: true },
    { key: "eligibility", label: "Eligibility", core: true }, { key: "deadline", label: "Sale deadline (UTC)", kind: "date", core: true },
    { key: "valuation", label: "Entry price or valuation" }, { key: "vesting", label: "Vesting and unlocks" },
    { key: "productEvidence", label: "Product or team evidence" }, { key: "downside", label: "Main downside" },
  ],
  Degens: [
    { key: "chain", label: "Chain", core: true }, { key: "identifier", label: "Contract address", core: true },
    { key: "direction", label: "Direction", fromPrediction: true }, { key: "entry", label: "Entry or trigger", kind: "number", fromPrediction: true },
    { key: "target", label: "Target", kind: "number", fromPrediction: true }, { key: "invalidation", label: "Invalidation", fromPrediction: true },
    { key: "expiry", label: "Expiry (UTC)", kind: "date", fromPrediction: true }, { key: "sourceType", label: "Source type", fromPrediction: true },
    { key: "catalyst", label: "Short catalyst" }, { key: "disclosure", label: "Position or paid promotion disclosure" },
  ],
  Traders: [
    { key: "asset", label: "Asset", core: true }, { key: "venue", label: "Venue", core: true },
    { key: "direction", label: "Long or short", fromPrediction: true }, { key: "entry", label: "Entry or trigger", kind: "number", fromPrediction: true },
    { key: "stop", label: "Stop", kind: "number", fromPrediction: true }, { key: "target", label: "Target", kind: "number", fromPrediction: true },
    { key: "expiry", label: "Expiry (UTC)", kind: "date", fromPrediction: true }, { key: "instrument", label: "Spot or derivatives", options: ["Spot", "Derivatives"] },
    { key: "setup", label: "Short setup explanation" },
  ],
  "Project Analysts": [
    { key: "decision", label: "Decision this helps", core: true }, { key: "product", label: "Product", core: true },
    { key: "users", label: "Actual users or traction", core: true }, { key: "official", label: "Official evidence", kind: "url", core: true },
    { key: "independent", label: "Independent check" }, { key: "valuation", label: "Valuation or tokenomics" },
    { key: "positive", label: "Main positive finding" }, { key: "risk", label: "Main risk" }, { key: "checkpoint", label: "What to watch next" },
  ],
  "Seed and Early Stage Investors": [
    { key: "opportunity", label: "Opportunity", core: true }, { key: "access", label: "Access route", core: true },
    { key: "stage", label: "Stage", core: true }, { key: "terms", label: "Public terms or valuation", core: true },
    { key: "lockup", label: "Lockup" }, { key: "teamProduct", label: "Team and product evidence" },
    { key: "invalidation", label: "What could invalidate the thesis" }, { key: "milestone", label: "Milestone" },
    { key: "reviewDate", label: "Review date (UTC)", kind: "date" },
  ],
  "NFT Specialists": [
    { key: "collection", label: "Collection", core: true }, { key: "network", label: "Network", core: true },
    { key: "official", label: "Official contract or mint", core: true }, { key: "cost", label: "Entry cost", core: true },
    { key: "eligibility", label: "Eligibility" }, { key: "supply", label: "Supply" }, { key: "utility", label: "Utility or community evidence" },
    { key: "liquidity", label: "Liquidity" }, { key: "catalyst", label: "Catalyst" }, { key: "downside", label: "Downside" },
    { key: "deadline", label: "Deadline (UTC)", kind: "date" },
  ],
  "Meta Catchers": [
    { key: "theme", label: "Emerging theme", core: true }, { key: "projects", label: "Affected projects or networks", core: true },
    { key: "earlyEvidence", label: "Concrete early evidence", core: true }, { key: "whyNow", label: "Why it matters now", core: true },
    { key: "target", label: "Observable adoption or demand target" }, { key: "invalidation", label: "What would disprove it" },
    { key: "horizon", label: "Expected horizon (UTC)", kind: "date" },
  ],
};

export function legacyDetails(category: LaunchCategory, context: Record<string, string>) {
  const get = (key: string) => context[key] || "Unknown";
  const join = (...keys: string[]) => keys.map(get).filter((x) => x !== "Unknown").join("; ") || "Unknown";
  switch (category) {
    case "Whitelist Hunters": return { official: get("official"), eligibility: get("eligibility"), steps: join("action", "cost"), deadline: get("deadline") };
    case "Airdrop Hunters": return { protocol: join("project", "network"), actions: get("testedSteps"), status: get("status"), costs: get("costs") };
    case "Presale Hunters": return { terms: get("official"), window: get("deadline"), eligibility: get("eligibility"), vesting: join("vesting", "downside") };
    case "Degens": return { catalyst: get("catalyst"), observations: join("entry", "expiry"), risks: get("invalidation"), position: get("disclosure") };
    case "Traders": return { setup: join("asset", "venue", "direction", "setup"), data: join("entry", "expiry"), risk: join("stop", "target"), position: "Unknown" };
    case "Project Analysts": return { thesis: join("decision", "product"), team: join("users", "independent"), counter: get("risk") };
    case "Seed and Early Stage Investors": return { thesis: join("opportunity", "stage"), terms: get("terms"), diligence: join("teamProduct", "invalidation"), milestones: join("milestone", "reviewDate") };
    case "NFT Specialists": return { mint: join("official", "cost", "supply"), rights: get("utility"), market: join("liquidity", "downside") };
    case "Meta Catchers": return { pattern: join("theme", "projects"), signals: get("earlyEvidence"), horizon: get("horizon"), disprove: get("invalidation") };
  }
}
