export const launchPolicy = {
  version: "2026-10-05.1",
  newAlphasPerUtcDay: 3,
  ordinaryXpPerUtcWeek: 900,
  enhancedActiveLimit: 3,
  materialUpdateXpPerOpportunityWeek: 100,
  work: { actionable: 50, tested: 150, substantial: 300 },
  prediction: {
    standard: {
      normal: { met: 50, failed: -10, reserve: 0 },
      high: { met: 150, failed: -50, reserve: 50 },
    },
    enhanced: {
      normal: { met: 300, failed: -60, reserve: 0 },
      high: { met: 900, failed: -300, reserve: 300 },
    },
  },
  upgrade: { Bronze: 1500, Silver: 3000, Gold: 4500, Platinum: 6000 },
} as const;

export type WorkClass = keyof typeof launchPolicy.work;
export type Commitment = "normal" | "high";
export type PredictionClass = "standard" | "enhanced";
export type PredictionResult = "met" | "failed";

export function utcDay(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function utcWeek(date: Date) {
  const monday = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  monday.setUTCDate(monday.getUTCDate() - ((monday.getUTCDay() + 6) % 7));
  return utcDay(monday);
}

export function ordinaryAward(requested: number, positiveAwardedThisWeek: number) {
  if (!Number.isInteger(requested) || requested < 0 || !Number.isInteger(positiveAwardedThisWeek) || positiveAwardedThisWeek < 0)
    throw new Error("Invalid XP amount");
  return Math.min(requested, Math.max(0, launchPolicy.ordinaryXpPerUtcWeek - positiveAwardedThisWeek));
}

export function availableProgress(netPersonalXp: number, appliedToUpgrades: number, activeHighReservations: number) {
  return netPersonalXp - appliedToUpgrades - activeHighReservations;
}

export type PredictionTerms = {
  commitment: Commitment;
  predictionClass: PredictionClass;
  baseline: string;
  target: string;
  invalidation: string;
  horizon: string | null;
  startsAt?: string | null;
  sourceType: "public_research" | "private_lead" | "claimed_insider" | "unknown";
};

export function predictionEligibility(terms: PredictionTerms, submittedAt: Date, category?: string) {
  const missing: string[] = [];
  const supplied = (value: string) => value.trim().length > 2 && !/^(unknown|not applicable)$/i.test(value.trim());
  if (!supplied(terms.baseline)) missing.push("original baseline");
  if (!supplied(terms.target) || terms.baseline.trim().toLowerCase() === terms.target.trim().toLowerCase()) missing.push("measurable target");
  if (category === "Traders" || category === "Degens") {
    if (!Number.isFinite(Number(terms.baseline)) || Number(terms.baseline) <= 0) missing.push("numeric price baseline");
    if (!Number.isFinite(Number(terms.target)) || Number(terms.target) <= 0) missing.push("numeric price target");
  }
  if (!terms.invalidation.trim() || /^unknown$/i.test(terms.invalidation.trim())) missing.push("failure criterion");
  const horizon = terms.horizon ? new Date(terms.horizon) : null;
  if (!horizon || !Number.isFinite(horizon.getTime()) || horizon <= submittedAt) missing.push("future horizon");
  if (terms.predictionClass === "enhanced") {
    const start = terms.startsAt ? new Date(terms.startsAt) : null;
    if (!start || !Number.isFinite(start.getTime()) || start <= submittedAt) missing.push("future approved start");
    if (!start || !horizon || !Number.isFinite(horizon.getTime()) || horizon.getTime() - start.getTime() < 30 * 86400000)
      missing.push("30-day enhanced window");
  }
  return { eligible: missing.length === 0, missing };
}

export type PriceBar = { at: string; low: number; high: number };
export function settlePricePath(
  bars: PriceBar[],
  terms: { side: "long" | "short"; entry: number; stop: number; target: number; expiry: string },
  completeThroughExpiry = false,
): { status: "Met" | "Failed" | "Inconclusive" | "Cancelled"; reason: string } {
  const { side, entry, stop, target } = terms;
  if (![entry, stop, target].every((v) => Number.isFinite(v) && v > 0) ||
      (side === "long" ? !(stop < entry && target > entry && target - entry >= 2 * (entry - stop))
        : !(stop > entry && target < entry && entry - target >= 2 * (stop - entry))))
    return { status: "Inconclusive", reason: "Registered entry, stop and target are not eligible for outcome XP." };
  const expiry = Date.parse(terms.expiry);
  if (!Number.isFinite(expiry)) return { status: "Inconclusive", reason: "Expiry is unavailable." };
  let triggered = false;
  for (const bar of [...bars].sort((a, b) => a.at.localeCompare(b.at))) {
    const at = Date.parse(bar.at);
    if (!Number.isFinite(at) || at > expiry || !Number.isFinite(bar.low) || !Number.isFinite(bar.high) || bar.low > bar.high) continue;
    const entered = bar.low <= entry && bar.high >= entry;
    if (!triggered && !entered) continue;
    const justTriggered = !triggered;
    triggered = true;
    const hitTarget = side === "long" ? bar.high >= target : bar.low <= target;
    const hitStop = side === "long" ? bar.low <= stop : bar.high >= stop;
    if (hitTarget && hitStop) return { status: "Inconclusive", reason: "Target and stop occurred in one observation interval; event order is unknown." };
    if (justTriggered && (hitTarget || hitStop)) return { status: "Inconclusive", reason: "Entry and exit occurred in one observation interval; event order is unknown." };
    if (hitStop) return { status: "Failed", reason: "Invalidation was observed before the target." };
    if (hitTarget) return { status: "Met", reason: "Target was observed after entry and before invalidation." };
  }
  if (!triggered) return completeThroughExpiry
    ? { status: "Cancelled", reason: "No trigger was observed before expiry." }
    : { status: "Inconclusive", reason: "Available history cannot establish whether the entry triggered." };
  if (completeThroughExpiry) return { status: "Failed", reason: "Entry triggered and the target was not observed by expiry." };
  return { status: "Inconclusive", reason: "Available observations do not establish the target or failure in order." };
}
