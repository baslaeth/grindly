import { beforeAll, afterAll, beforeEach, afterEach, it, expect } from "vitest";
import { randomUUID } from "node:crypto";
import { createTestDatabase } from "./database";
import type { ChatSnapshot } from "../../src/chat/model";
import type { Snapshot } from "../../src/research/model";
let db: Awaited<ReturnType<typeof createTestDatabase>>;
const ids = Array.from({ length: 5 }, () => randomUUID());
let bindings: string[] = [];
const contract = `0x${"c".repeat(40)}`;
const room = "bronze-traders";
beforeAll(async () => {
  db = await createTestDatabase();
});
afterAll(async () => {
  await db?.close();
});
beforeEach(async () => {
  await db.exec("begin");
  bindings = [];
  for (const [i, id] of ids.entries()) {
    await db.query(
      "insert into auth.users(id,email,email_confirmed_at) values($1,$2,now());",
      [id, `${id}@example.test`],
    );
    await db.query(
      "insert into public.members(id,auth_user_id,email) values($1,$1,$2)",
      [id, `${id}@example.test`],
    );
    await db.query(
      "insert into public.research_profiles(member_id,display_name,specialty,is_demo) values($1,$2,'project',$3)",
      [id, `Isolated member ${i}`, i === 2 || i === 3],
    );
    await db.query(
      "insert into public.wallet_challenges(id,member_id,address,nonce,domain,uri,message,expires_at) values($1,$1,$2,$3,'localhost','http://localhost','proof',now()+interval '5 minutes')",
      [id, `0x${String(i + 1).repeat(40)}`, id],
    );
    await db.query("select public.bind_verified_wallet($1,$1,'proof')", [id]);
    bindings.push(
      (
        await db.query<{ id: string }>(
          "select public.bind_owned_token($1,$2,$3,'1','10',$4) id",
          [id, contract, String(i + 1), `0x${"e".repeat(64)}`],
        )
      ).rows[0]!.id,
    );
    if (i === 1 || i === 3) {
      await db.query(
        "insert into public.member_roles(member_id,role) values($1,'reviewer'),($1,'steward')",
        [id],
      );
      await db.query(
        "insert into public.research_reviewer_scopes values($1,'project','Isolated independent project review',$1)",
        [id],
      );
    }
  }
  await db.query(
    `insert into public.promotion_decisions(member_id,membership_binding_id,chain_id,contract_address,token_id,ownership_epoch,approved_by,rationale,evidence)
    select member_id,id,chain_id,contract_address,token_id,ownership_epoch,$2,'Isolated Silver evidence test','[{"kind":"fixture"}]'
    from public.membership_bindings where id=$1`,
    [bindings[4], ids[1]],
  );
  await db.exec("set role service_role");
});
afterEach(async () => {
  await db.exec("rollback;reset role");
});
async function rpc<T = Record<string, unknown>>(name: string, args: unknown[]) {
  return (
    await db.query<{ v: T }>(
      `select public.${name}(${args.map((_, i) => `$${i + 1}`).join(",")}) v`,
      args,
    )
  ).rows[0]!.v;
}
async function rejected(action: () => Promise<unknown>, pattern = /research:/) {
  await db.exec("savepoint rejected");
  await expect(action()).rejects.toThrow(pattern);
  await db.exec("rollback to savepoint rejected");
}
const chat = (
  i: number,
  action: string,
  data: object = {},
  request = randomUUID(),
  r = room,
) =>
  rpc<{ id: string; revision: string }>("chat_mutate", [
    ids[i],
    bindings[i],
    r,
    request,
    action,
    JSON.stringify(data),
  ]);
const send = (
  i = 0,
  body = "A source worth discussing",
  extra: object = {},
  req = randomUUID(),
  r = room,
) => chat(i, "send", { body, reply: null, attachments: [], ...extra }, req, r);
const snapshot = (
  i = 0,
  r = room,
  before: number | null = null,
  after: number | null = null,
) =>
  rpc<ChatSnapshot>("chat_snapshot", [ids[i], bindings[i], r, before, after]);
const research = (i = 0) =>
  rpc<Snapshot>("research_snapshot_v3", [ids[i], bindings[i], room]);
const mutate = (i: number, action: string, data: object) =>
  rpc<{ id: string }>("research_mutate_v3", [
    ids[i],
    bindings[i],
    action,
    JSON.stringify({ room, ...data }),
  ]);
const submission = {
  finding: null,
  previous: null,
  visibility: "members",
  specialty: "project",
  claim: "An isolated documented evidence claim",
  sources: [{ url: "https://example.test/source", label: "Fixture source" }],
  addition: "Distinct documented analysis",
  limitations: "No real outcome claimed",
  observedAt: "2026-09-24T12:00:00Z",
};

it("creates ten rooms for every exact rank without granting unverified access", async () => {
  expect(
    (
      await db.query<{ n: number }>(
        "select count(*)::int n from public.research_questions",
      )
    ).rows[0]!.n,
  ).toBe(50);
  await rejected(() => snapshot(0, "silver-general"));
  await rejected(() => snapshot(4, room));
  await rejected(() =>
    rpc("chat_snapshot", [ids[0], bindings[1], room, null, null]),
  );
  await db.query(
    "update public.membership_bindings set revoked_at=now() where id=$1",
    [bindings[0]],
  );
  await rejected(() => snapshot());
});
it("isolates marked fixtures from genuine records, profiles, counts and linked IDs", async () => {
  await send(0, "Genuine visibility fixture");
  await send(2, "QA isolated fixture");
  expect((await snapshot()).messages.map((m) => m.body)).toEqual([
    "Genuine visibility fixture",
  ]);
  expect((await snapshot(2)).messages.map((m) => m.body)).toEqual([
    "QA isolated fixture",
  ]);
  const s = await research();
  expect(s.directory).toHaveLength(2);
  expect(s.demoProfiles).toEqual([]);
  expect(JSON.stringify(s)).not.toContain(ids[2]);
  expect((await research(2)).directory).toHaveLength(2);
});
it("retries a send exactly once and rejects key reuse with different content", async () => {
  const key = randomUUID();
  const first = await send(0, "Persistent text", {}, key);
  expect(await send(0, "Persistent text", {}, key)).toEqual(first);
  await rejected(() => send(0, "Different payload", {}, key));
  expect((await snapshot()).messages).toHaveLength(1);
});
it("persists room-scoped replies and idempotent reactions without awarding XP", async () => {
  const first = await send();
  await send(1, "Independent reply", { reply: first.id });
  await chat(1, "react", { message: first.id, emoji: "thanks", active: true });
  await chat(1, "react", { message: first.id, emoji: "thanks", active: true });
  const s = await snapshot(1);
  expect(s.messages[1]!.reply).toBe(first.id);
  expect(s.messages[0]!.reactions).toEqual([
    { emoji: "thanks", count: 1, mine: true },
  ]);
  await rejected(() =>
    send(0, "Wrong room", { reply: first.id }, randomUUID(), "bronze-degens"),
  );
  await rejected(() =>
    chat(2, "react", { message: first.id, emoji: "like", active: true }),
  );
  expect((await research()).awards).toEqual([]);
});
it("keeps source revisions immutable through author edit and deletion", async () => {
  const first = await send();
  const f = await mutate(0, "submit", {
    ...submission,
    sourceMessage: first.id,
  });
  const revision = (await snapshot()).messages[0]!.revision;
  await rejected(() =>
    chat(1, "edit", { message: first.id, revision, body: "Impersonation" }),
  );
  await chat(0, "edit", {
    message: first.id,
    revision,
    body: "Corrected conversation",
  });
  let s = await research();
  expect(s.sourceSnapshots![0]!.body).toBe("A source worth discussing");
  expect(s.sourceSnapshots![0]!.author).toBe(ids[0]);
  expect(s.versions[0]!.finding_id).toBe(f.id);
  await rejected(() =>
    chat(0, "edit", { message: first.id, revision, body: "Stale edit" }),
  );
  const edited = (await snapshot()).messages[0]!;
  await chat(0, "delete", { message: first.id, revision: edited.revision });
  expect((await snapshot()).messages[0]!.deleted).toBe(true);
  s = await research();
  expect(s.messages[0]!.body).toBe("[Message deleted]");
  expect(s.sourceSnapshots![0]!.body).toBe("A source worth discussing");
  await rejected(() =>
    mutate(0, "submit", { ...submission, sourceMessage: first.id }),
  );
});
it("protects uploaded media ownership, rank, demo boundary and deleted visibility", async () => {
  const id = randomUUID();
  await rpc("chat_upload", [
    ids[0],
    bindings[0],
    room,
    id,
    "image/gif",
    "R0lGODlh",
    6,
  ]);
  await rejected(() => rpc("chat_media_read", [ids[1], bindings[1], id]));
  await rejected(() => send(1, "Stolen upload", { attachments: [id] }));
  const msg = await send(0, "", { attachments: [id] });
  expect((await snapshot()).messages[0]!.body).toBe("");
  expect((await snapshot()).messages[0]!.edited).toBe(false);
  expect(await rpc("chat_media_read", [ids[1], bindings[1], id])).toEqual({
    type: "image/gif",
    content: "R0lGODlh",
  });
  await rejected(() => rpc("chat_media_read", [ids[4], bindings[4], id]));
  await rejected(() => rpc("chat_media_read", [ids[2], bindings[2], id]));
  const finding = await mutate(0, "submit", {
    ...submission,
    sourceMessage: msg.id,
    visibility: "reviewers",
  });
  const version = (await research()).versions.find(
    (v) => v.finding_id === finding.id,
  )!;
  await chat(0, "delete", {
    message: msg.id,
    revision: (await snapshot()).messages[0]!.revision,
  });
  await rejected(() => rpc("chat_media_read", [ids[0], bindings[0], id]));
  expect(
    await rpc("chat_source_media_read", [ids[1], bindings[1], id, version.id]),
  ).toEqual({ type: "image/gif", content: "R0lGODlh" });
  await rejected(() =>
    rpc("chat_source_media_read", [ids[4], bindings[4], id, version.id]),
  );
  await rejected(() =>
    rpc("chat_source_media_read", [ids[2], bindings[2], id, version.id]),
  );
  await rejected(() =>
    rpc("chat_source_media_read", [ids[0], bindings[0], id, randomUUID()]),
  );
  expect((await research()).sourceSnapshots![0]!.attachments).toEqual([
    { id, type: "image/gif" },
  ]);
});
it("uses stored read state and keyset older history with isolated unread counts", async () => {
  for (let i = 0; i < 45; i++) {
    // Operator seeding in the isolated database is not a live send/rate-limit bypass.
    await db.query(
      "insert into public.discussion_messages(question_id,author_id,specialty,body) values($1,$2,'project',$3)",
      [room, ids[1], `History ${i}`],
    );
  }
  let s = await snapshot();
  expect(s.messages).toHaveLength(40);
  expect(s.hasOlder).toBe(true);
  expect(s.unread[room]).toBe(45);
  const older = await snapshot(0, room, s.messages[0]!.sequence);
  expect(older.messages).toHaveLength(5);
  expect(older.hasOlder).toBe(false);
  await chat(0, "read", { sequence: s.messages.at(-1)!.sequence });
  s = await snapshot();
  expect(s.unread[room]).toBe(0);
  await chat(0, "read", { sequence: older.messages[0]!.sequence });
  expect((await snapshot()).unread[room]).toBe(0);
});
it("records evaluation and real awards atomically once and keeps self-review denied", async () => {
  await mutate(0, "submit", submission);
  const s = await research();
  const a = s.assignments[0]!;
  const decision = {
    version: a.version_id,
    assignment: a.id,
    decision: "accept",
    reason: "Independent evidence in exact scope",
    conflicts: "None in fixture",
    conflictFree: true,
  };
  await rejected(() => mutate(0, "review", decision));
  await mutate(1, "review", decision);
  await mutate(1, "review", decision);
  const result = await research();
  expect(result.awards).toHaveLength(1);
  expect(result.activity).toHaveLength(2);
  expect(result.activity!.find((a) => a.kind === "xp")!.xp).toBe(
    result.policy.acceptance_xp,
  );
  expect((await research(2)).activity).toEqual([]);
});
it("public sample cards omit protected data and registration checks exact eligibility", async () => {
  const cards = await rpc<{ id: string; name: string }[]>("opportunity_list", [
    true,
  ]);
  expect(cards).toHaveLength(3);
  expect(JSON.stringify(cards)).not.toMatch(
    /protected_url|allocation_code|auth_user_id/,
  );
  const card = cards.find((c) => c.name.includes("roundtable"))!;
  await rejected(() =>
    rpc("opportunity_action", [ids[0], bindings[0], card.id, "participate"]),
  );
  expect(
    await rpc("opportunity_action", [
      ids[2],
      bindings[2],
      card.id,
      "participate",
    ]),
  ).toEqual({ registration: "interested", isDemo: true });
  await rpc("opportunity_action", [
    ids[2],
    bindings[2],
    card.id,
    "participate",
  ]);
  expect(
    (await db.query("select * from public.opportunity_registrations")).rows,
  ).toHaveLength(1);
  const silver = cards.find((c) => c.name.includes("Silver"))!;
  await rejected(() =>
    rpc("opportunity_action", [ids[2], bindings[2], silver.id, "participate"]),
  );
});
it("requires independent operator-verified requirements and never infers hierarchical eligibility", async () => {
  const payload = {
    name: "Isolated genuine-scope test",
    description: "Synthetic row only in rolled-back database",
    kind: "Test",
    ranks: ["Bronze"],
    requirements: "Confirmed prerequisites",
    approvalRequired: true,
    status: "open",
    publicVisible: true,
    action: "external",
    url: "https://example.test/private-campaign",
  };
  await rejected(() =>
    rpc("opportunity_manage", [
      ids[0],
      bindings[0],
      "save",
      JSON.stringify(payload),
    ]),
  );
  const o = await rpc<{ id: string }>("opportunity_manage", [
    ids[1],
    bindings[1],
    "save",
    JSON.stringify(payload),
  ]);
  await rejected(
    () =>
      rpc("opportunity_manage", [
        ids[1],
        bindings[1],
        "save",
        JSON.stringify({ ...payload, approvalRequired: false }),
      ]),
    /opportunity_requirements_verified/,
  );
  expect(JSON.stringify(await rpc("opportunity_list", [false]))).not.toContain(
    "private-campaign",
  );
  await rejected(() =>
    rpc("opportunity_action", [ids[0], bindings[0], o.id, "participate"]),
  );
  await rejected(() =>
    rpc("opportunity_manage", [
      ids[3],
      bindings[3],
      "requirement",
      JSON.stringify({
        id: o.id,
        member: ids[0],
        approved: true,
        reason: "Wrong authority boundary",
      }),
    ]),
  );
  await rpc("opportunity_manage", [
    ids[1],
    bindings[1],
    "requirement",
    JSON.stringify({
      id: o.id,
      member: ids[0],
      approved: true,
      reason: "Isolated evidence checked",
    }),
  ]);
  expect(
    await rpc("opportunity_action", [ids[0], bindings[0], o.id, "participate"]),
  ).toEqual({ url: payload.url });
  await rpc("opportunity_manage", [
    ids[1],
    bindings[1],
    "save",
    JSON.stringify({
      ...payload,
      id: o.id,
      requirements: "Different confirmed prerequisites",
    }),
  ]);
  await rejected(() =>
    rpc("opportunity_action", [ids[0], bindings[0], o.id, "participate"]),
  );
  expect(
    (
      await db.query<{ reason: string }>(
        "select reason from public.opportunity_requirements where opportunity_id=$1",
        [o.id],
      )
    ).rows[0]!.reason,
  ).toBe("Isolated evidence checked");
  await rejected(() =>
    rpc("opportunity_action", [ids[4], bindings[4], o.id, "participate"]),
  );
  await rejected(() =>
    rpc("opportunity_manage", [
      ids[1],
      bindings[1],
      "save",
      JSON.stringify({ ...payload, action: "claim" }),
    ]),
  );
});
it("allows an explicitly simulated Silver demo member to register without granting Bronze room access", async () => {
  await db.query(
    "update public.research_profiles set is_demo=true where member_id=$1",
    [ids[4]],
  );
  const cards = await rpc<{ id: string; name: string }[]>("opportunity_list", [
    true,
  ]);
  const silver = cards.find((c) => c.name.includes("Silver"))!;
  expect(
    await rpc("opportunity_action", [
      ids[4],
      bindings[4],
      silver.id,
      "participate",
    ]),
  ).toEqual({ registration: "registered", isDemo: true });
  expect((await snapshot(4, "silver-general")).messages).toEqual([]);
  await rejected(() => snapshot(4, room));
});
