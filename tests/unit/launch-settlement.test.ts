import { describe, expect, it } from "vitest";
import { verifyCoinbasePath } from "@/launch/settlement";
import type { CheckedSource } from "@/alpha/model";

const submitted = "2026-10-05T00:30:00.000Z";
const expiry = "2026-10-05T03:00:00.000Z";
const terms = { direction: "long", entry: "100", stop: "90", target: "120" };
const context = { asset: "ETH", venue: "Coinbase Exchange", instrument: "Spot" };
function source(candles: number[][], market = "ETH-USD", missingBuckets = 0): CheckedSource {
  return { id: "market-history", label: "Coinbase Exchange ETH-USD", url: "https://api.exchange.coinbase.com/products/ETH-USD/candles",
    status: "retrieved", checkedAt: "2026-10-05T04:00:00.000Z", publishedAt: null, digest: "test",
    facts: JSON.stringify({ market, bucketSeconds: 3600, start: "2026-10-05T00:00:00.000Z",
      endExclusive: expiry, expectedBuckets: 3, missingBuckets, candles }) };
}
const bar = (hour: number, low: number, high: number) => [Date.parse(`2026-10-05T0${hour}:00:00.000Z`) / 1000, low, high, low, high, 1];

describe("saved prediction market path", () => {
  it("requires an entry after submission and target after entry", () => {
    const observed = source([bar(0, 105, 110), bar(1, 99, 101), bar(2, 101, 121)]);
    expect(verifyCoinbasePath(observed, "ETH", submitted, expiry, terms, context).status).toBe("Met");
    expect(verifyCoinbasePath(observed, "ETH-USD", submitted, expiry, terms, { ...context, asset: "ETH-USD" }).status).toBe("Met");
  });
  it("does not count a possible pre-submission entry", () => {
    const observed = source([bar(0, 99, 101), bar(1, 105, 110), bar(2, 121, 123)]);
    expect(verifyCoinbasePath(observed, "ETH", submitted, expiry, terms, context).status).toBe("Inconclusive");
  });
  it("distinguishes complete no-trigger from gaps and wrong assets", () => {
    const observed = source([bar(0, 105, 110), bar(1, 102, 110), bar(2, 104, 111)]);
    expect(verifyCoinbasePath(observed, "ETH", submitted, expiry, terms, context).status).toBe("Cancelled");
    expect(verifyCoinbasePath(source([bar(0, 105, 110), bar(1, 102, 110), bar(2, 104, 111)], "BTC-USD"), "ETH", submitted, expiry, terms, context).status).toBe("Inconclusive");
    expect(verifyCoinbasePath(source([bar(0, 105, 110), bar(1, 102, 110), bar(2, 104, 111)], "ETH-USD", 1), "ETH", submitted, expiry, terms, context).status).toBe("Inconclusive");
    expect(verifyCoinbasePath(observed, "VRAX", submitted, expiry, terms, { ...context, asset: "VRAX" }).status).toBe("Inconclusive");
    expect(verifyCoinbasePath(observed, "ETH", submitted, expiry, terms, { ...context, venue: "Other exchange" }).status).toBe("Inconclusive");
    expect(verifyCoinbasePath(observed, "ETH", submitted, expiry, terms, { ...context, instrument: "Derivatives" }).status).toBe("Inconclusive");
  });
});
