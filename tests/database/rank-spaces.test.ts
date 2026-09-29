import { beforeAll, afterAll, beforeEach, afterEach, expect, it } from "vitest";
import { createTestDatabase } from "./database";
import type { Snapshot } from "../../src/research/model";
import { evidenceBrief } from "../../src/research/model";
let db: Awaited<ReturnType<typeof createTestDatabase>>;
const ids = Array.from(
  { length: 6 },
  (_, i) => `${i + 1}`.repeat(8) + "-1111-4111-8111-" + `${i + 1}`.repeat(12),
);
const contract = `0x${"c".repeat(40)}`;
let bindings: string[];
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
      "insert into auth.users(id,email,email_confirmed_at) values($1,$2,now())",
      [id, `${id}@example.test`],
    );
    await db.query(
      "insert into public.members(id,auth_user_id,email) values($1,$1,$2)",
      [id, `${id}@example.test`],
    );
    await db.query(
      "insert into public.research_profiles(member_id,display_name,specialty,is_demo,bio) values($1,$2,$3,true,$4)",
      [
        id,
        `TEST member ${i}`,
        i % 3 === 0 ? "project" : i % 3 === 1 ? "risk" : "operations",
        `TEST bio ${i}`,
      ],
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
    await db.query(
      "insert into public.member_roles(member_id,role) values($1,'reviewer')",
      [id],
    );
    await db.query(
      "insert into public.research_reviewer_scopes values($1,'project','TEST independent project review',$2)",
      [id, ids[0]],
    );
  }
  await db.query(
    "insert into public.member_roles(member_id,role) values($1,'steward')",
    [ids[2]],
  );
  for (const index of [3, 4, 5]) await promote(index);
  await db.exec("set role service_role");
});
afterEach(async () => {
  await db.exec("rollback;reset role");
});
async function promote(index: number) {
  return db.query(
    `insert into public.promotion_decisions(member_id,membership_binding_id,chain_id,contract_address,token_id,ownership_epoch,approved_by,rationale,evidence)
    select member_id,id,chain_id,contract_address,token_id,ownership_epoch,$2,'TEST explicitly illustrative promotion','[{"kind":"isolated-fixture"}]'::jsonb
    from public.membership_bindings where id=$1`,
    [bindings[index], ids[2]],
  );
}
async function snapshot(index = 0, room?: string) {
  return (
    await db.query<{ s: Snapshot }>(
      "select public.research_snapshot_v2($1,$2,$3) s",
      [ids[index], bindings[index], room ?? null],
    )
  ).rows[0]!.s;
}
async function mutate(
  index: number,
  action: string,
  data: Record<string, unknown> = {},
) {
  return (
    await db.query<{ r: { id: string } }>(
      "select public.research_mutate_v2($1,$2,$3,$4::jsonb) r",
      [ids[index], bindings[index], action, JSON.stringify(data)],
    )
  ).rows[0]!.r;
}
async function reject(
  action: () => Promise<unknown>,
  pattern = /rank|binding|room|available|reviewer/,
) {
  await db.exec("savepoint rejected");
  await expect(action()).rejects.toThrow(pattern);
  await db.exec("rollback to savepoint rejected");
}
const payload = {
  finding: null,
  previous: null,
  visibility: "members",
  specialty: "project",
  claim: "TEST documented claim with explicit limits",
  sources: [{ url: "https://example.test/source", label: "TEST source" }],
  addition: "TEST attributable added evidence",
  limitations: "TEST no real outcome claimed",
  observedAt: "2026-09-24T12:00:00Z",
};
async function submit(index = 0, extra: Record<string, unknown> = {}) {
  return mutate(index, "submit", { ...payload, ...extra });
}
async function accept(index = 0) {
  const s = await snapshot(index);
  const f = s.findings[0]!;
  const a = s.assignments.find(
    (a) => a.version_id === f.current_version && !a.completed_at,
  )!;
  return mutate(ids.indexOf(a.reviewer_id), "review", {
    version: a.version_id,
    assignment: a.id,
    decision: "accept",
    reason: "TEST independent scope assessment",
    conflicts: "None in synthetic fixture",
    conflictFree: true,
  });
}

it("persists exactly ten rooms per rank with non-hierarchical directory and sample counts", async () => {
  for (const [index, rank] of [
    [0, "Bronze"],
    [3, "Silver"],
  ] as const) {
    const s = await snapshot(index);
    expect(s.rooms).toHaveLength(10);
    expect(s.rooms!.every((r) => r.rank === rank)).toBe(true);
    expect(s.directory).toHaveLength(3);
    expect(s.directory!.every((p) => p.tier === rank)).toBe(true);
    expect(s.demoProfiles!.every((p) => p.rank === rank)).toBe(true);
    expect(JSON.stringify(s.directory)).not.toContain("@example.test");
  }
  expect(
    (await snapshot(0)).demoProfiles!.length +
      (await snapshot(3)).demoProfiles!.length,
  ).toBe(9);
  await reject(() => snapshot(0, "silver-general"));
  await reject(() => snapshot(3, "testnet-readiness"));
  await reject(() => snapshot(0, "gold-general"));
});
it("retains empty rooms honestly and writes persistent category messages with the session author", async () => {
  const room = "bronze-nft-specialists";
  expect((await snapshot(0, room)).messages).toHaveLength(0);
  const a = await mutate(0, "message", {
    room,
    body: "TEST NFT rights question",
    sources: [],
  });
  await mutate(1, "message", {
    room,
    body: "TEST complementary answer",
    sources: [],
    reply: a.id,
  });
  const s = await snapshot(1, room);
  expect(s.messages.map((m) => m.author_id).sort()).toEqual([ids[0], ids[1]]);
  expect(s.messages.find((m) => m.reply_to === a.id)!.author_id).toBe(ids[1]);
  expect(s.messages.every((m) => m.question_id === room)).toBe(true);
  expect(s.awards).toHaveLength(0);
  await reject(() =>
    mutate(1, "message", {
      room: "testnet-readiness",
      body: "TEST wrong room",
      sources: [],
      reply: a.id,
    }),
  );
});
it.each([
  [0, 3],
  [3, 0],
])(
  "blocks every cross-rank record action from %i to %i",
  async (owner, intruder) => {
    const m = await mutate(owner, "message", {
      body: "TEST secret rank conversation",
      sources: [],
    });
    const f = await submit(owner, { sourceMessage: m.id });
    await accept(owner);
    const before = await snapshot(owner);
    const version = before.findings[0]!.current_version;
    for (const [action, data] of [
      ["message", { body: "TEST bad reply", sources: [], reply: m.id }],
      ["submit", { ...payload, sourceMessage: m.id }],
      ["submit", { ...payload, relatedVersion: version }],
      [
        "submit",
        {
          ...payload,
          finding: f.id,
          previous: version,
          correction: "TEST correction attempt",
        },
      ],
      ["useful", { version, detail: "TEST unauthorized endorsement" }],
      ["dispute", { version, reason: "TEST unauthorized dispute" }],
      ["assign", { version }],
      [
        "review",
        {
          version,
          assignment: before.assignments[0]!.id,
          decision: "correct",
          reason: "TEST unauthorized review",
          conflicts: "None",
          conflictFree: true,
        },
      ],
      ["deliverAssignment", { version }],
    ] as const)
      await reject(() => mutate(intruder, action, data));
    const hidden = JSON.stringify(await snapshot(intruder));
    for (const value of [
      f.id,
      version!,
      m.id,
      "TEST secret rank conversation",
      "TEST documented claim",
    ])
      expect(hidden).not.toContain(value);
    expect(await snapshot(owner)).toEqual(before);
    expect(evidenceBrief(before).accepted).toHaveLength(1);
  },
);
it("filters private lineage in the new snapshot in both rank directions", async () => {
  for (const index of [0, 3]) {
    const hidden = await submit(index, {
      visibility: "reviewers",
      claim: "TEST hidden confidential claim",
    });
    const initial = await snapshot(index);
    const hiddenVersion = initial.findings[0]!.current_version!;
    const visible = await submit(index, { claim: "TEST public rank claim" });
    const publicVersion = (await snapshot(index)).findings.find(
      (f) => f.id === visible.id,
    )!.current_version!;
    // Historical incompatible link: privileged fixture only; normal writes reject it.
    await db.exec(
      "reset role; set constraints all immediate; alter table public.finding_versions disable trigger immutable_record",
    );
    await db.query(
      "update public.finding_versions set related_version=$1 where id=$2",
      [hiddenVersion, publicVersion],
    );
    await db.exec(
      "alter table public.finding_versions enable trigger immutable_record; set role service_role",
    );
    await db.query(
      "delete from public.research_reviewer_scopes where member_id=$1",
      [ids[index + 1]],
    );
    const s = await snapshot(index + 1);
    expect(JSON.stringify(s)).not.toContain(hidden.id);
    expect(JSON.stringify(s)).not.toContain(hiddenVersion);
    expect(JSON.stringify(s)).not.toContain("TEST hidden confidential claim");
    expect(
      s.versions.find((v) => v.id === publicVersion)!.related_version,
    ).toBeNull();
  }
});
it("preserves exact-rank correction, independent review and idempotent personally attributed credit", async () => {
  const f = await submit(0, { room: "bronze-project-analysts" });
  const s = await snapshot();
  const a = s.assignments[0]!;
  const review = {
    version: a.version_id,
    assignment: a.id,
    decision: "accept",
    reason: "TEST scoped evidence assessment",
    conflicts: "None",
    conflictFree: true,
  };
  await reject(() => mutate(0, "review", review));
  const reviewer = ids.indexOf(a.reviewer_id);
  await mutate(reviewer, "review", review);
  await mutate(reviewer, "review", review);
  const accepted = await snapshot();
  expect(accepted.personalCredit!.xp).toBe(25);
  expect((await snapshot(reviewer)).personalCredit!.xp).toBe(0);
  expect(accepted.awards).toHaveLength(1);
  await submit(0, {
    finding: f.id,
    previous: a.version_id,
    correction: "TEST adding a clearer limitation",
  });
  expect(evidenceBrief(await snapshot()).accepted).toHaveLength(0);
  await accept();
  expect((await snapshot()).personalCredit!.xp).toBe(25);
});
it("closes a review when its reviewer moves rank and selects an independent same-rank replacement", async () => {
  await submit();
  const first = (await snapshot()).assignments[0]!;
  const index = ids.indexOf(first.reviewer_id);
  await promote(index);
  await mutate(2, "assign", { version: first.version_id });
  const s = await snapshot();
  expect(
    s.assignments.find((a) => a.id === first.id)!.completed_at,
  ).not.toBeNull();
  expect(s.assignments.find((a) => !a.completed_at)!.reviewer_id).not.toBe(
    first.reviewer_id,
  );
  await reject(() =>
    mutate(index, "review", {
      version: first.version_id,
      assignment: first.id,
    }),
  );
});
it("a transferred Silver NFT retains tier; buyer earns no seller XP or research access to Bronze", async () => {
  await submit(3);
  await accept(3);
  expect((await snapshot(3)).personalCredit!.xp).toBe(25);
  const historyBefore = await db.query("select * from public.award_ledger");
  const newBinding = (
    await db.query<{ id: string }>(
      "select public.bind_owned_token($1,$2,'4','2','20',$3) id",
      [ids[0], contract, `0x${"f".repeat(64)}`],
    )
  ).rows[0]!.id;
  await reject(() => snapshot(3), /binding/);
  bindings[0] = newBinding;
  const recipient = await snapshot();
  expect(recipient.question.rank).toBe("Silver");
  expect(recipient.personalCredit!.xp).toBe(0);
  expect(
    recipient.directory!.find((p) => p.id === ids[0])!.acquisitions[0]!.kind,
  ).toBe("unknown");
  expect((await db.query("select * from public.award_ledger")).rows).toEqual(
    historyBefore.rows,
  );
  await reject(() => snapshot(0, "testnet-readiness"));
  const returned = (
    await db.query<{ id: string }>(
      "select public.bind_owned_token($1,$2,'4','3','30',$3) id",
      [ids[3], contract, `0x${"a".repeat(64)}`],
    )
  ).rows[0]!.id;
  bindings[3] = returned;
  expect((await snapshot(3)).question.rank).toBe("Silver");
  expect((await snapshot(3)).personalCredit!.xp).toBe(25);
});
it("fictional delegation attribution has separate authors/owners and never writes award or membership rows", async () => {
  const s = await snapshot();
  const delegated = s.demoMessages!.find((m) => m.delegation_id)!;
  const grant = s.demoDelegations!.find(
    (d) => d.id === delegated.delegation_id,
  )!;
  expect(delegated.author_id).toBe(grant.delegate_id);
  expect(grant.owner_id).toBe("david");
  expect(
    s
      .demoMessages!.filter((m) => m.author_id === "david")
      .every((m) => m.delegation_id === null),
  ).toBe(true);
  expect(s.personalCredit!.xp).toBe(0);
  expect(s.awards).toHaveLength(0);
  expect(s.directory).toHaveLength(3);
});
it("denies unbound/spoofed identities and browser calls to every new table/RPC", async () => {
  await reject(() =>
    db.query("select public.research_snapshot_v2($1,$2,null)", [
      ids[0],
      bindings[3],
    ]),
  );
  for (const role of ["anon", "authenticated"]) {
    await db.exec(`reset role;set role ${role}`);
    for (const table of [
      "nft_tier_events",
      "nft_acquisition_events",
      "rank_demo_profiles",
      "rank_demo_messages",
      "rank_demo_delegations",
    ])
      await reject(
        () => db.exec(`select * from public.${table}`),
        /permission denied/,
      );
    await reject(
      () =>
        db.query("select public.research_snapshot_v2($1,$2,null)", [
          ids[0],
          bindings[0],
        ]),
      /permission denied/,
    );
    await reject(
      () =>
        db.query("select public.research_mutate_v2($1,$2,'message','{}')", [
          ids[0],
          bindings[0],
        ]),
      /permission denied/,
    );
  }
});
it("legacy endpoints cannot expose Silver rooms through the old executable", async () => {
  const legacy = await db.query<{ data: Snapshot }>(
    "select public.research_snapshot($1) data",
    [ids[0]],
  );
  expect(legacy.rows[0]!.data.rooms!.every((r) => r.rank === "Bronze")).toBe(
    true,
  );
  await reject(
    () => db.query("select public.research_snapshot($1)", [ids[3]]),
    /rank-aware/,
  );
  await reject(
    () =>
      db.query("select public.research_mutate($1,'message',$2::jsonb)", [
        ids[3],
        JSON.stringify({
          body: "TEST no legacy Silver write",
          sources: [],
          reply: null,
        }),
      ]),
    /rank-aware/,
  );
});
it("directory includes permitted non-posters and members with no specialist profile", async () => {
  await db.exec("reset role");
  await db.query("delete from public.research_profiles where member_id=$1", [
    ids[1],
  ]);
  await db.exec("set role service_role");
  const data = await snapshot();
  expect(data.messages).toHaveLength(0);
  expect(data.directory!.map((p) => p.id).sort()).toEqual(
    ids.slice(0, 3).sort(),
  );
  expect(data.directory!.find((p) => p.id === ids[1])!.name).toBe("Member");
  expect(JSON.stringify(data.directory)).not.toContain("@example.test");
  expect(data.directory!.some((p) => ids.slice(3).includes(p.id))).toBe(false);
});
