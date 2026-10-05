import { describe, expect, it } from "vitest";
import { availableProgress, launchPolicy, ordinaryAward, predictionEligibility, settlePricePath, utcWeek } from "@/launch/policy";

describe("launch policy", () => {
  it("caps only positive ordinary credit in a UTC Monday week", () => {
    expect(utcWeek(new Date("2026-10-04T23:59:59Z"))).toBe("2026-09-28");
    expect(utcWeek(new Date("2026-10-05T00:00:00Z"))).toBe("2026-10-05");
    expect(ordinaryAward(300, 800)).toBe(100);
    expect(ordinaryAward(50, 900)).toBe(0);
    expect(launchPolicy.prediction.enhanced.high.failed).toBe(-300);
  });
  it("keeps signed losses and reservations out of available progression", () => {
    expect(availableProgress(-10, 0, 0)).toBe(-10);
    expect(availableProgress(4600, 1500, 300)).toBe(2800);
  });
  it("leaves incomplete and too-short enhanced forecasts unvalidated", () => {
    const submitted = new Date("2026-10-05T00:00:00Z");
    expect(predictionEligibility({ commitment: "normal", predictionClass: "standard", baseline: "Unknown", target: "", invalidation: "Unknown", horizon: null, sourceType: "unknown" }, submitted).eligible).toBe(false);
    expect(predictionEligibility({ commitment: "high", predictionClass: "enhanced", baseline: "1", target: "2", invalidation: "Below 0.8", horizon: "2026-11-03T00:00:00Z", sourceType: "public_research" }, submitted).missing).toContain("30-day enhanced window");
    expect(predictionEligibility({ commitment: "normal", predictionClass: "standard", baseline: "40 monthly users", target: "100 monthly users", invalidation: "Fewer than 100 users", horizon: "2026-11-03T00:00:00Z", sourceType: "public_research" }, submitted).eligible).toBe(true);
    expect(predictionEligibility({ commitment: "normal", predictionClass: "standard", baseline: "40 monthly users", target: "100 monthly users", invalidation: "Fewer than 100 users", horizon: "2026-11-03T00:00:00Z", sourceType: "public_research" }, submitted, "Traders").eligible).toBe(false);
  });
  it("requires ordered observations and never guesses within a candle", () => {
    const terms = { side: "long" as const, entry: 100, stop: 90, target: 120, expiry: "2026-10-08T00:00:00Z" };
    expect(settlePricePath([{ at: "2026-10-06T00:00:00Z", low: 99, high: 101 }, { at: "2026-10-07T00:00:00Z", low: 101, high: 121 }], terms).status).toBe("Met");
    expect(settlePricePath([{ at: "2026-10-06T00:00:00Z", low: 89, high: 121 }], terms).status).toBe("Inconclusive");
    expect(settlePricePath([{ at: "2026-10-06T00:00:00Z", low: 105, high: 110 }], terms, true).status).toBe("Cancelled");
    expect(settlePricePath([{ at: "2026-10-06T00:00:00Z", low: 99, high: 101 }, { at: "2026-10-07T00:00:00Z", low: 89, high: 105 }], terms).status).toBe("Failed");
  });
});
