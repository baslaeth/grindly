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

const snapshot = {
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
  "renders an editable correction without irrelevant peer enrichment (%s)",
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
    expect(html).toContain("Correct version 1");
    expect(html).toContain('name="correction"');
    expect(html).toContain("Submit corrected version");
    expect(html).not.toContain("disabled");
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
  const html = renderToStaticMarkup(await ResearchScreen({ view: "review" }));
  expect(html).toContain("The author must submit a corrected version.");
  expect(html).toContain("/findings/new?revise=version");
  expect(html).not.toContain("Awaiting an available scoped reviewer");
});
