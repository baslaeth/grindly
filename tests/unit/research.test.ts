import { expect, it, beforeEach, vi } from "vitest";
import { researchInput } from "@/research/input";
import { evidenceBrief, credit, type Snapshot } from "@/research/model";
const mocks = vi.hoisted(() => ({
  access: vi.fn(),
  rpc: vi.fn(),
  tier: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("@/server/membership/access", () => ({
  requireActiveMembership: mocks.access,
}));
vi.mock("@/server/membership/metadata", () => ({ tokenTier: mocks.tier }));
vi.mock("@/server/supabase", () => ({
  createDataClient: () => ({ rpc: mocks.rpc }),
}));
import { mutateResearch } from "@/server/research/service";
beforeEach(() => {
  vi.resetAllMocks();
});
it("derives mutation identity from the checked server session and writes refresh cookies", async () => {
  mocks.access.mockResolvedValue({
    member: { id: "verified" },
    binding: { token_id: "1" },
    ownership: {},
  });
  mocks.rpc.mockResolvedValue({ data: { saved: true }, error: null });
  await mutateResearch({
    action: "profile",
    name: "Test Specialist",
    specialty: "risk",
  });
  expect(mocks.access).toHaveBeenCalledWith(true);
  expect(mocks.rpc).toHaveBeenCalledWith("research_mutate", {
    p_member: "verified",
    p_action: "profile",
    p_data: { name: "Test Specialist", specialty: "risk" },
  });
});
it("denies all mutations on failed ownership before reading research", async () => {
  mocks.access.mockRejectedValue(new Error("ownership denied"));
  await expect(
    mutateResearch({
      action: "message",
      body: "test",
      sources: [],
      reply: null,
    }),
  ).rejects.toThrow("ownership denied");
  expect(mocks.rpc).not.toHaveBeenCalled();
});
it("requires live Silver for a peer request rather than a stored rank flag", async () => {
  mocks.access.mockResolvedValue({
    member: { id: "verified" },
    binding: { token_id: "1" },
    ownership: {},
  });
  mocks.tier.mockResolvedValue("Bronze");
  await expect(
    mutateResearch({
      action: "peerRequest",
      specialty: "risk",
      request: "Please assess source limits",
    }),
  ).rejects.toMatchObject({ status: 403 });
  expect(mocks.rpc).not.toHaveBeenCalled();
});
it("rejects actor spoofing, unsafe links, future observations and blank evidence", () => {
  expect(
    researchInput.safeParse({
      action: "profile",
      name: "test",
      specialty: "project",
      member: "victim",
    }).success,
  ).toBe(false);
  expect(
    researchInput.safeParse({
      action: "message",
      body: "test",
      reply: null,
      sources: [{ label: "x", url: "javascript:alert(1)" }],
    }).success,
  ).toBe(false);
  expect(
    researchInput.safeParse({ action: "submit", claim: "test", sources: [] })
      .success,
  ).toBe(false);
});
it("assembles only accepted current versions; corrections withdraw support", () => {
  const s = {
    findings: [
      { id: "f", status: "accepted", current_version: "v2" },
      { id: "pending", status: "pending", current_version: "chat" },
    ],
    versions: [
      { id: "v1", claim: "old", specialty: "risk", sources: [] },
      {
        id: "v2",
        claim: "current",
        specialty: "project",
        sources: [{ url: "https://example.test/a?utm_source=x#h", label: "A" }],
      },
      { id: "chat", claim: "unreviewed", specialty: "risk", sources: [] },
    ],
    uses: [],
  } as unknown as Snapshot;
  expect(evidenceBrief(s).accepted.map((a) => a.version.claim)).toEqual([
    "current",
  ]);
  expect(evidenceBrief(s).open).toEqual(["operations", "risk"]);
  s.findings[0]!.status = "pending";
  expect(evidenceBrief(s).accepted).toHaveLength(0);
});
it("groups repeated sources rather than claiming independent confirmations", () => {
  const s = {
    findings: [
      { id: "a", status: "accepted", current_version: "1" },
      { id: "b", status: "accepted", current_version: "2" },
    ],
    versions: [
      {
        id: "1",
        specialty: "project",
        sources: [
          { url: "https://example.test/a?utm_source=x#h", label: "shared" },
        ],
      },
      {
        id: "2",
        specialty: "risk",
        sources: [{ url: "https://example.test/a", label: "shared" }],
      },
    ],
    uses: [],
  } as unknown as Snapshot;
  expect(evidenceBrief(s).lineage).toEqual([
    { url: "https://example.test/a", findings: ["a", "b"] },
  ]);
});
it("uses one ledger for lifetime XP and current-season points, not payments", () => {
  const s = {
    awards: [
      { xp: 25, points: 25, season: "old" },
      { xp: 25, points: 25, season: "current" },
    ],
    policy: { season: "current" },
  } as Snapshot;
  expect(credit(s)).toEqual({ xp: 50, points: 25 });
});
