import { expect, it, vi } from "vitest";
import {
  mergeMessages,
  shouldSend,
  draftKey,
  chatInput,
  type ChatMessage,
} from "@/chat/model";
import { opportunityInput, participationReason } from "@/opportunities/model";
import { nextRank } from "@/research/spaces";
vi.mock("server-only", () => ({}));
import { validateImage } from "@/server/chat/media";
import sharp from "sharp";
it("merges repeated live batches and updates without duplicate messages", () => {
  const first = { id: "a", sequence: 1, body: "old" } as ChatMessage;
  expect(
    mergeMessages(
      [first],
      [{ ...first, body: "edited" }, { id: "b", sequence: 2 } as ChatMessage],
    ),
  ).toEqual([
    { ...first, body: "edited" },
    { id: "b", sequence: 2 },
  ]);
});
it("sends Enter only outside IME composition and keeps Shift+Enter", () => {
  const event = {
    key: "Enter",
    shiftKey: false,
    isComposing: false,
    keyCode: 13,
  };
  expect(shouldSend(event)).toBe(true);
  expect(shouldSend({ ...event, shiftKey: true })).toBe(false);
  expect(shouldSend({ ...event, isComposing: true })).toBe(false);
  expect(shouldSend({ ...event, keyCode: 229 })).toBe(false);
});
it("separates draft keys by account and room", () => {
  expect(draftKey("a", "general")).not.toBe(draftKey("b", "general"));
  expect(draftKey("a", "general")).not.toBe(draftKey("a", "traders"));
});
it("requires client request identity but accepts attachment-only sends", () => {
  expect(
    chatInput.safeParse({
      room: "bronze-traders",
      request: "10000000-0000-4000-8000-000000000000",
      mutation: {
        action: "send",
        body: "",
        reply: null,
        attachments: ["20000000-0000-4000-8000-000000000000"],
      },
    }).success,
  ).toBe(true);
  expect(
    chatInput.safeParse({
      room: "../secret",
      mutation: { action: "send", body: "" },
    }).success,
  ).toBe(false);
});
it("parses real participation and every operator action without ambiguous discriminators", () => {
  const id = "11111111-1111-4111-8111-111111111111";
  for (const action of ["state", "participate"]) {
    expect(opportunityInput.safeParse({ action, id }).success).toBe(true);
  }
  expect(
    opportunityInput.safeParse({ action: "manage", operation: "list" }).success,
  ).toBe(true);
  expect(
    opportunityInput.safeParse({
      action: "manage",
      operation: "requirement",
      data: {
        id,
        member: id,
        approved: true,
        reason: "Evidence independently checked",
      },
    }).success,
  ).toBe(true);
  expect(
    opportunityInput.safeParse({
      action: "manage",
      operation: "save",
      data: {
        name: "Sample opportunity",
        description: "Isolated sample description",
        kind: "Research",
        ranks: ["Bronze"],
        requirements: "",
        approvalRequired: false,
        status: "draft",
        startsAt: null,
        endsAt: null,
        publicVisible: false,
        action: "details",
        url: "",
      },
    }).success,
  ).toBe(true);
  expect(
    opportunityInput.safeParse({ action: "participate", id, member: "spoofed" })
      .success,
  ).toBe(false);
});
it("validates actual image bytes, rejects spoofed types, SVG and oversize files", async () => {
  const png = await sharp({
    create: { width: 2, height: 2, channels: 4, background: "white" },
  })
    .png()
    .toBuffer();
  expect((await validateImage(png, "image/png")).type).toBe("image/png");
  await expect(validateImage(png, "image/gif")).rejects.toMatchObject({
    code: "INVALID_IMAGE",
  });
  await expect(
    validateImage(
      Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>'),
      "image/svg+xml",
    ),
  ).rejects.toMatchObject({ code: "INVALID_IMAGE" });
  await expect(
    validateImage(Buffer.alloc(2097153), "image/png"),
  ).rejects.toMatchObject({ status: 413 });
});
it("retains valid GIF animation and strips non-image trailing payload", async () => {
  const gif = await sharp({
    create: { width: 2, height: 2, channels: 3, background: "white" },
  })
    .gif()
    .toBuffer();
  const clean = await validateImage(
    Buffer.concat([gif, Buffer.from("PRIVATE_TRAILING_PAYLOAD")]),
    "image/gif",
  );
  expect(clean.type).toBe("image/gif");
  expect(clean.buffer.toString()).not.toContain("PRIVATE_TRAILING_PAYLOAD");
});
it("does not turn rank into hierarchical opportunity eligibility or invent a next Diamond tier", () => {
  const card = {
    id: "x",
    name: "Sample",
    description: "Test",
    kind: "test",
    ranks: ["Bronze"],
    requirements: "",
    approvalRequired: false,
    status: "open",
    startsAt: null,
    endsAt: null,
    action: "register" as const,
    isDemo: true,
  };
  expect(participationReason(card, "Diamond", true, false)).toContain("Bronze");
  expect(participationReason(card, null, false, false)).toContain("membership");
  expect(participationReason(card, "Bronze", false, false)).toContain("sample");
  expect(
    participationReason(
      { ...card, approvalRequired: true },
      "Bronze",
      true,
      false,
    ),
  ).toContain("verification");
  expect(participationReason(card, "Bronze", true, false)).toBe(null);
  expect(nextRank("Bronze")).toBe("Silver");
  expect(nextRank("Diamond")).toBe(null);
  expect(nextRank("unknown")).toBe(null);
});
