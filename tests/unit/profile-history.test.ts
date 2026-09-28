import { expect, it } from "vitest";
import { profileHistory, type Snapshot } from "@/research/model";

it("profiles retain public attributed versions/reviews but never expose private histories", () => {
  const data = {
    findings: [
      { id: "public", author_id: "owner", visibility: "members" },
      { id: "private", author_id: "owner", visibility: "reviewers" },
      { id: "other", author_id: "peer", visibility: "members" },
    ],
    versions: [
      { id: "v1", finding_id: "public" },
      { id: "v2", finding_id: "public" },
      { id: "secret-version", finding_id: "private" },
      { id: "peer-v", finding_id: "other" },
    ],
    decisions: [
      { id: "correction", version_id: "v1", reviewer_id: "peer" },
      { id: "accept", version_id: "v2", reviewer_id: "peer" },
      {
        id: "secret-review",
        version_id: "secret-version",
        reviewer_id: "owner",
      },
      { id: "own-review", version_id: "peer-v", reviewer_id: "owner" },
      {
        id: "inaccessible",
        version_id: "not-in-snapshot",
        reviewer_id: "owner",
      },
    ],
  } as unknown as Snapshot;
  const result = profileHistory(data, "owner");
  expect(result.findings.map((f) => f.id)).toEqual(["public"]);
  expect(result.reviews.map((r) => r.decision.id)).toEqual([
    "correction",
    "accept",
    "own-review",
  ]);
  expect(JSON.stringify(result)).not.toMatch(/secret|private|inaccessible/);
  expect(profileHistory(data, "unrelated")).toEqual({
    findings: [],
    reviews: [],
  });
});
