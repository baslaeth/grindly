import { beforeEach, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { Snapshot } from "@/research/model";
const mocks = vi.hoisted(() => ({
  access: vi.fn(),
  rpc: vi.fn(),
  tier: vi.fn(),
  peer: vi.fn(),
  from: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
}));
vi.mock("@/server/environment", () => ({
  getEnvironment: () => ({ GRINDLY_STAGE: "membership" }),
}));
vi.mock("@/server/membership/access", () => ({
  requireActiveMembership: mocks.access,
}));
vi.mock("@/server/membership/metadata", () => ({ tokenTier: mocks.tier }));
vi.mock("@/server/membership/chain", () => ({ readOwnership: mocks.peer }));
vi.mock("@/server/supabase", () => ({
  createDataClient: () => ({ rpc: mocks.rpc, from: mocks.from }),
}));
import { ResearchScreen } from "@/components/research-screen";
import { ServiceError } from "@/server/errors";
import { readResearch } from "@/server/research/service";

const snapshot = {
  evaluationAvailable: true,
  question: { id: "bronze-general", category: "General", rank: "Bronze" },
  profiles: [
    {
      member_id: "actor",
      display_name: "TEST author",
      specialty: "project",
      is_demo: true,
    },
    {
      member_id: "peer",
      display_name: "TEST peer",
      specialty: "risk",
      is_demo: true,
    },
  ],
  findings: [
    {
      id: "finding",
      author_id: "actor",
      current_version: "version",
      status: "needs_correction",
      visibility: "members",
    },
  ],
  versions: [
    {
      id: "version",
      finding_id: "finding",
      version: 1,
      specialty: "project",
      claim: "TEST original claim",
      sources: [],
      addition: "TEST added evidence",
      limitations: "TEST limitations",
      observed_at: "2026-09-24T12:00:00Z",
    },
  ],
  messages: [],
  assignments: [],
  decisions: [],
  uses: [],
  disputes: [],
  awards: [],
  requests: [],
  roles: [],
} as unknown as Snapshot;
beforeEach(() => {
  vi.resetAllMocks();
  mocks.access.mockResolvedValue({
    member: { id: "actor" },
    binding: { token_id: "1", contract_address: "contract" },
    ownership: { block: "100" },
  });
  mocks.rpc.mockResolvedValue({ data: snapshot, error: null });
  mocks.tier.mockResolvedValue("Bronze");
  mocks.from.mockImplementation((table: string) => {
    if (table === "membership_bindings") return mocks.peer();
    const q = {
      select: () => q,
      eq: () => q,
      maybeSingle: async () => ({ data: null, error: null }),
    };
    return q;
  });
});
it.each(["hang", "failure"])(
  "renders correction fields without peer enrichment but holds launch submission until activation (%s)",
  async (mode) => {
    if (mode === "hang")
      mocks.peer.mockImplementation(() => new Promise(() => {}));
    else
      mocks.peer.mockImplementation(() => {
        throw new Error("Private provider error must not be rendered");
      });
    const html = renderToStaticMarkup(
      await ResearchScreen({ view: "new", revise: "version" }),
    );
    expect(html).toContain("Updating version 1");
    expect(html).toContain('name="correction"');
    expect(html).toContain("Submit corrected version");
    expect(html).toContain("Submissions are temporarily unavailable");
    expect(html).toMatch(/<button[^>]*\bdisabled\b/);
    expect(mocks.access).toHaveBeenCalledWith(false);
    expect(mocks.peer).not.toHaveBeenCalled();
  },
);
it("does not bypass acting-member ownership to render an editor", async () => {
  vi.spyOn(console, "warn").mockImplementation(() => {});
  mocks.access.mockRejectedValue(
    new ServiceError("MEMBERSHIP_REQUIRED", "Denied", 403),
  );
  const html = renderToStaticMarkup(
    await ResearchScreen({ view: "new", revise: "version" }),
  );
  expect(html).not.toContain("Submit corrected version");
  expect(mocks.rpc).not.toHaveBeenCalled();
  vi.restoreAllMocks();
});
it("shows the author's correction next action instead of awaiting a reviewer", async () => {
  mocks.rpc.mockResolvedValue({
    data: { ...snapshot, roles: ["reviewer"] },
    error: null,
  });
  const html = renderToStaticMarkup(await ResearchScreen({ view: "review" }));
  expect(html).toContain("Your correction is needed");
  expect(html).toContain("/findings/new?revise=version");
  expect(html).not.toContain("Awaiting an available scoped reviewer");
});
it.each([
  { room: "silver-general" },
  { profile: "hidden-member" },
  { finding: "hidden-finding" },
  { version: "hidden-version" },
  { message: "hidden-message" },
])(
  "fails closed for a direct inaccessible research context %j",
  async (context) => {
    if (context.room)
      mocks.rpc.mockResolvedValue({
        data: null,
        error: { message: "research: rank denied" },
      });
    await expect(readResearch(true, context)).rejects.toMatchObject({
      status: context.room ? 403 : 404,
    });
    expect(mocks.access).toHaveBeenCalledWith(true);
    expect(mocks.peer).not.toHaveBeenCalled();
  },
);
it("rejects a rank changed between snapshot and tier read", async () => {
  mocks.rpc.mockResolvedValue({
    data: { ...snapshot, question: { rank: "Bronze" } },
    error: null,
  });
  mocks.tier.mockResolvedValue("Silver");
  await expect(readResearch()).rejects.toMatchObject({
    code: "RANK_CHANGED",
    status: 409,
  });
});
it("retains the existing gated read only when the additive RPC is not installed", async () => {
  mocks.rpc
    .mockResolvedValueOnce({
      data: null,
      error: { code: "PGRST202", message: "function missing" },
    })
    .mockResolvedValueOnce({ data: snapshot, error: null });
  expect((await readResearch()).alphaSchemaAvailable).toBe(false);
  expect(mocks.rpc.mock.calls.map((c) => c[0])).toEqual([
    "alpha_snapshot",
    "research_snapshot_v3",
  ]);
  expect(mocks.access).toHaveBeenCalledWith(false);
});
it("never falls back after an authorization or transport error", async () => {
  mocks.rpc.mockResolvedValue({
    data: null,
    error: { code: "P0001", message: "research: denied" },
  });
  await expect(readResearch()).rejects.toMatchObject({ status: 403 });
  expect(mocks.rpc).toHaveBeenCalledTimes(1);
});
it.each([401, 403, 503])(
  "Grind Intelligence fails closed when membership fails (%s)",
  async (status) => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    mocks.access.mockRejectedValue(
      new ServiceError("MEMBERSHIP_UNAVAILABLE", "Private diagnostic", status),
    );
    const html = renderToStaticMarkup(
      await ResearchScreen({ view: "intelligence" }),
    );
    expect(html).toContain("AI analysis is not connected yet.");
    expect(html).not.toContain("Select an alpha");
    expect(html).not.toContain("Private diagnostic");
    expect(mocks.rpc).not.toHaveBeenCalled();
    vi.restoreAllMocks();
  },
);
it("Grind Intelligence does not disclose an inaccessible alpha or offer a fallback selection", async () => {
  vi.spyOn(console, "warn").mockImplementation(() => {});
  const html = renderToStaticMarkup(
    await ResearchScreen({
      view: "intelligence",
      id: "other-rank-private-alpha",
    }),
  );
  expect(html).toContain("not available to your membership");
  expect(html).not.toContain("other-rank-private-alpha");
  expect(html).not.toContain("Select an alpha");
  expect(mocks.access).toHaveBeenCalledWith(false);
  vi.restoreAllMocks();
});
