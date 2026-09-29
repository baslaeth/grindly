import { expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));
import { RankSpace } from "@/components/rank-space";
import type { ResearchData } from "@/research/model";
it("labels rejected reviews accurately and identifies sample profiles before their history", () => {
  const data = {
    memberId: "owner",
    question: { id: "bronze-traders", category: "Traders" },
    token: { tier: "Bronze" },
    personalCredit: { xp: 0, points: 0 },
    rooms: [],
    messages: [],
    directory: [
      {
        id: "owner",
        name: "Isolated author",
        is_demo: true,
        bio: "Test fixture",
        specialty: "project",
        tier: "Bronze",
        acquisitions: [],
        progression: [],
        personal_xp: 0,
        contract: "contract",
        token: "2",
      },
    ],
    profiles: [
      {
        member_id: "owner",
        specialty: "project",
        display_name: "Isolated author",
        is_demo: true,
      },
    ],
    findings: [
      {
        id: "finding",
        author_id: "owner",
        current_version: "version",
        visibility: "members",
        status: "rejected",
      },
    ],
    versions: [
      {
        id: "version",
        finding_id: "finding",
        claim: "An isolated rejected claim",
        version: 1,
      },
    ],
    decisions: [
      {
        id: "decision",
        version_id: "version",
        reviewer_id: "peer",
        decision: "reject",
        created_at: "2026-09-29T12:00:00Z",
        scope: "Evidence scope",
        reason: "Unsupported claim",
      },
    ],
  } as unknown as ResearchData;
  const html = renderToStaticMarkup(
    RankSpace({ data, profileId: "owner", children: null }),
  );
  expect(html).toContain("Rejected with reason");
  expect(html).not.toContain("Correction requested");
  expect(
    html.indexOf("Isolated sample account and test activity"),
  ).toBeLessThan(html.indexOf("Category record"));
});
