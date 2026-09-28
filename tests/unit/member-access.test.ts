import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ access: vi.fn(), rpc: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/server/membership/access", () => ({
  requireActiveMembership: mocks.access,
}));
vi.mock("@/server/supabase", () => ({
  createDataClient: () => ({ rpc: mocks.rpc }),
}));
import { readChat, writeChat } from "@/server/chat/service";
import { actOnOpportunity } from "@/server/opportunities";
beforeEach(() => {
  vi.resetAllMocks();
  mocks.access.mockResolvedValue({
    member: { id: "session-member" },
    binding: { id: "live-binding" },
  });
  mocks.rpc.mockResolvedValue({ data: { saved: true }, error: null });
});
it("derives chat identity from live ownership and uses writable session refresh", async () => {
  await readChat("bronze-traders");
  expect(mocks.access).toHaveBeenCalledWith(true);
  expect(mocks.rpc).toHaveBeenCalledWith(
    "chat_snapshot",
    expect.objectContaining({
      p_member: "session-member",
      p_binding: "live-binding",
      p_room: "bronze-traders",
    }),
  );
  await writeChat({
    room: "bronze-traders",
    request: "11111111-1111-4111-8111-111111111111",
    mutation: { action: "send", body: "test", reply: null, attachments: [] },
  });
  expect(mocks.rpc).toHaveBeenCalledWith(
    "chat_mutate",
    expect.objectContaining({
      p_member: "session-member",
      p_binding: "live-binding",
    }),
  );
});
it.each(["read", "send", "opportunity"])(
  "fails closed before private %s access when ownership is unavailable",
  async (kind) => {
    mocks.access.mockRejectedValue(new Error("ownership unavailable"));
    const action =
      kind === "read"
        ? readChat("bronze-traders")
        : kind === "send"
          ? writeChat({
              room: "bronze-traders",
              request: "11111111-1111-4111-8111-111111111111",
              mutation: {
                action: "send",
                body: "test",
                reply: null,
                attachments: [],
              },
            })
          : actOnOpportunity({
              action: "participate",
              id: "11111111-1111-4111-8111-111111111111",
            });
    await expect(action).rejects.toThrow("ownership unavailable");
    expect(mocks.rpc).not.toHaveBeenCalled();
  },
);
it("rechecks membership on each opportunity participation instead of trusting the displayed card", async () => {
  await actOnOpportunity({
    action: "participate",
    id: "11111111-1111-4111-8111-111111111111",
  });
  expect(mocks.access).toHaveBeenCalledWith(true);
  expect(mocks.rpc).toHaveBeenCalledWith(
    "opportunity_action",
    expect.objectContaining({
      p_member: "session-member",
      p_binding: "live-binding",
      p_action: "participate",
    }),
  );
});
