import { expect, it } from "vitest";
import { launchEvidenceIssues } from "@/launch/evidence-summary";
import type { AlphaVersion, AlphaSnapshot, CheckedSource } from "@/alpha/model";
const alpha: AlphaVersion = {
  version_id: "v",
  category: "Traders",
  contribution_type: "prediction",
  purpose: "Controlled test",
  subject: "BTC",
  chain: "",
  contract: "",
  details: {},
  evidence: [],
  first_noticed: null,
  horizon: "2026-11-10T12:00:00Z",
  check_condition: "Target before stop",
  source_created_at: null,
  created_at: "2026-11-10T01:00:00Z",
};
const terms: NonNullable<AlphaSnapshot["launchTerms"]>[number] = {
  version_id: "v",
  member_id: "m",
  policy_version: "2026-10-05.1",
  opportunity: "BTC",
  useful_action: "Controlled test",
  cost_or_risk: "Test risk",
  created_at: alpha.created_at,
  prediction_validated: true,
  prediction: {
    commitment: "normal",
    predictionClass: "standard",
    baseline: "100",
    invalidation: "Stop first",
    sourceType: "public_research",
    startsAt: null,
    entry: "100",
    stop: "90",
    target: "125",
    direction: "long",
  },
  context: { asset: "BTC", venue: "Coinbase Exchange", instrument: "Spot" },
};
const source = {
  status: "retrieved",
  label: "Coinbase observed quote",
} as CheckedSource;
it("does not turn a coherent retrieved quote into a successful forecast", () => {
  const issues = launchEvidenceIssues(alpha, terms, [source]);
  expect(issues).toHaveLength(1);
  expect(issues[0]).toContain("not proof of the later outcome");
});
it("identifies contradictory terms and missing source observations", () => {
  const issues = launchEvidenceIssues(
    alpha,
    { ...terms, prediction: { ...terms.prediction!, stop: "110" } },
    [{ ...source, status: "unknown" }],
  );
  expect(issues.join(" ")).toContain("entry, stop and target conflict");
  expect(issues.join(" ")).toContain("no usable verified observation");
});
it("does not substitute Coinbase for unsupported Degen or mismatched asset paths", () => {
  expect(
    launchEvidenceIssues(
      { ...alpha, category: "Degens", subject: "VRAX" },
      terms,
      [source],
    ).join(" "),
  ).toContain("not supported for ordered outcome XP");
  expect(
    launchEvidenceIssues(
      alpha,
      { ...terms, context: { ...terms.context, asset: "ETH" } },
      [source],
    ).join(" "),
  ).toContain("must match");
});
it("reports absent checks, inadequate gross risk and non-hour deadlines", () => {
  const issues = launchEvidenceIssues(
    { ...alpha, horizon: "2026-11-10T12:05:00Z" },
    { ...terms, prediction: { ...terms.prediction!, target: "115" } },
    [],
  );
  expect(issues.join(" ")).toContain("below twice");
  expect(issues.join(" ")).toContain("not an exact UTC hour");
  expect(issues.join(" ")).toContain("not completed a saved check");
});
