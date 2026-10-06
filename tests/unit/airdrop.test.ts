import { describe, it, expect } from "vitest";
import { documentPassages } from "../../src/server/alpha/document-passages";
import { airdropEventCandidates } from "../../src/alpha/airdrop-events";
import {
  airdropGuideSchema,
  airdropGuideVersion,
} from "../../src/alpha/airdrop";
describe("airdrop evidence boundaries", () => {
  it("keeps decimal values and late material restrictions, excludes dialogs", () => {
    const html = `<main><article role="dialog"><p>Accept terms before continuing.</p></article><p>The allocation is 10,343,757.81 OP.</p>${Array.from({ length: 100 }, (_, i) => `<p>Ordinary project background paragraph ${i}.</p>`).join("")}<p>The campaign has been discontinued.</p><p>Claiming is for eligible users only; exclude bots.</p></main>`;
    const doc = documentPassages(html, "allocation OP");
    expect(doc.excerpt).toContain("10,343,757.81 OP");
    expect(doc.excerpt).toContain("discontinued");
    expect(doc.excerpt).not.toContain("Accept terms");
  });
  it("suppresses duplicates, cosmetic whitespace and unrelated marketing", () => {
    const old = ["Starknet claim opens on 2027-01-01T12:00:00Z."];
    expect(
      airdropEventCandidates(
        [
          "Starknet  claim opens on 2027-01-01T12:00:00Z.",
          "Join our community party!",
        ],
        old,
        "Starknet",
      ),
    ).toEqual([]);
  });
  it("keeps a future opening an announcement, never observed availability", () => {
    const [event] = airdropEventCandidates(
      ["Starknet claim opens on 2027-01-01T12:00:00Z."],
      [],
      "Starknet",
    );
    expect(event).toMatchObject({
      type: "claim_open",
      scheduledAt: "2027-01-01T12:00:00.000Z",
      availability: "announced",
    });
  });
  it("does not manufacture a date from tomorrow", () => {
    expect(
      airdropEventCandidates(
        ["Starknet claim opens tomorrow."],
        [],
        "Starknet",
      )[0]!.scheduledAt,
    ).toBeNull();
  });
  it("recognizes the captured opening wording without claiming current availability", () => {
    const [event] = airdropEventCandidates(
      [
        "STRK will become available for claiming on Starknet Mainnet starting at 12pm (UTC) on February 20th, 2024. Already today, anyone can check eligibility on the Provisions portal.",
      ],
      [],
      "Starknet",
    );
    expect(event).toMatchObject({
      type: "claim_open",
      scheduledAt: null,
      availability: "announced",
    });
  });
  it("queues changed deadlines and token announcements, not ordinary updates", () => {
    expect(
      airdropEventCandidates(
        ["Starknet claim deadline is 2027-01-02T12:00:00Z."],
        ["Starknet claim deadline is 2027-01-01T12:00:00Z."],
        "Starknet",
      )[0],
    ).toMatchObject({
      type: "deadline",
      scheduledAt: "2027-01-02T12:00:00.000Z",
    });
    expect(
      airdropEventCandidates(
        ["Starknet announces its token; no claim is available."],
        [],
        "Starknet",
      )[0],
    ).toMatchObject({ type: "announcement" });
    expect(
      airdropEventCandidates(
        ["Starknet announces its token."],
        [],
        "Starknet",
      )[0]?.type,
    ).toBe("announcement");
  });
  it("rejects omitted context while allowing explicit Unknown", () => {
    const value = {
      version: airdropGuideVersion,
      stage: "Unknown",
      official: "Unknown",
      confirmed: "Unknown",
      speculative: "Unknown",
      steps: "Unknown",
      prerequisites: "Unknown",
      testEvidence: "Unknown",
      exclusions: "Unknown",
    };
    expect(airdropGuideSchema.safeParse(value).success).toBe(true);
    expect(
      airdropGuideSchema.safeParse({ ...value, confirmed: undefined }).success,
    ).toBe(false);
  });
});
