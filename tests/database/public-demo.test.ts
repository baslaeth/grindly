import { afterAll, afterEach, beforeAll, beforeEach, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { createTestDatabase } from "./database";

let db: Awaited<ReturnType<typeof createTestDatabase>>;
const hash = "a".repeat(64);
beforeAll(async () => {
  db = await createTestDatabase();
});
afterAll(async () => {
  await db.close();
});
beforeEach(async () => {
  await db.exec("begin");
  await db.query("insert into public.demo_codes(token_hash) values($1)", [
    hash,
  ]);
});
afterEach(async () => {
  await db.exec("rollback; reset role");
});

async function join() {
  const user = randomUUID(),
    email = `${user}@example.test`;
  await db.query(
    "insert into auth.users(id,email,email_confirmed_at) values($1,$2,now())",
    [user, email],
  );
  await db.query("select public.reserve_demo_otp($1,$2)", [hash, email]);
  const member = (
    await db.query<{ id: string }>("select public.redeem_demo($1,$2) id", [
      hash,
      user,
    ])
  ).rows[0]!.id;
  const access = (
    await db.query<{ id: string }>(
      "select id from public.demo_access where member_id=$1",
      [member],
    )
  ).rows[0]!.id;
  return { user, email, member, access };
}

it("lets multiple verified people reuse a code with separate Bronze accounts and no NFT or roles", async () => {
  const a = await join(),
    b = await join();
  expect(a.member).not.toBe(b.member);
  expect(
    (
      await db.query<{ id: string }>("select public.redeem_demo($1,$2) id", [
        hash,
        a.user,
      ])
    ).rows[0]!.id,
  ).toBe(a.member);
  expect((await db.query("select * from public.members")).rows).toHaveLength(2);
  for (const table of [
    "wallet_bindings",
    "membership_bindings",
    "member_roles",
    "award_ledger",
  ])
    expect((await db.query(`select * from public.${table}`)).rows).toHaveLength(
      0,
    );
  await db.exec("set role service_role");
  const snapshot = (
    await db.query<{
      s: { rooms: unknown[]; directory: unknown[]; roles: unknown[] };
    }>("select public.alpha_snapshot($1,$2,null) s", [a.member, a.access])
  ).rows[0]!.s;
  expect(snapshot.rooms).toHaveLength(10);
  expect(snapshot.directory).toHaveLength(2);
  expect(snapshot.roles).toEqual([]);
  await db.query(
    "select public.research_mutate_v3($1,$2,'profile',$3::jsonb)",
    [
      a.member,
      a.access,
      JSON.stringify({
        name: "Visitor One",
        specialty: "operations",
        interest: "Airdrop Hunters",
      }),
    ],
  );
  expect(
    (
      await db.query<{ is_demo: boolean }>(
        "select is_demo from public.research_profiles where member_id=$1",
        [a.member],
      )
    ).rows[0]!.is_demo,
  ).toBe(true);
});

it("rejects forged grants, another rank, revoked access and conversion of a genuine account", async () => {
  const a = await join(),
    b = await join();
  for (const [member, access, room] of [
    [a.member, b.access, "testnet-readiness"],
    [a.member, a.access, "silver-general"],
  ]) {
    await db.exec("savepoint denied");
    await expect(
      db.query("select public.alpha_snapshot($1,$2,$3)", [
        member,
        access,
        room,
      ]),
    ).rejects.toThrow(/research:/);
    await db.exec("rollback to savepoint denied");
  }
  await db.query(
    "update public.demo_access set revoked_at=now() where member_id=$1",
    [a.member],
  );
  expect(
    (
      await db.query<{ ok: boolean }>(
        "select public.has_demo_access($1,$2) ok",
        [a.member, a.access],
      )
    ).rows[0]!.ok,
  ).toBe(false);
  await db.query(
    "update public.research_profiles set is_demo=false where member_id=$1",
    [b.member],
  );
  await expect(
    db.query("select public.redeem_demo($1,$2)", [hash, b.user]),
  ).rejects.toThrow(/returning member/);
});

it("requires verified email and a recent matching request, and enforces per-email cooldown", async () => {
  const user = randomUUID();
  await db.query(
    "insert into auth.users(id,email) values($1,'unverified@example.test')",
    [user],
  );
  await db.exec("savepoint denied");
  await expect(
    db.query("select public.redeem_demo($1,$2)", [hash, user]),
  ).rejects.toThrow(/Demo unavailable/);
  await db.exec("rollback to savepoint denied");
  await db.query("update auth.users set email_confirmed_at=now() where id=$1", [
    user,
  ]);
  await db.exec("savepoint no_request");
  await expect(
    db.query("select public.redeem_demo($1,$2)", [hash, user]),
  ).rejects.toThrow(/Demo unavailable/);
  await db.exec("rollback to savepoint no_request");
  const reserve = async (email: string, code = hash) =>
    (
      await db.query<{ ok: boolean }>(
        "select public.reserve_demo_otp($1,$2) ok",
        [code, email],
      )
    ).rows[0]!.ok;
  expect(await reserve("unverified@example.test")).toBe(true);
  expect(await reserve("unverified@example.test")).toBe(false);
  expect(await reserve("second@example.test")).toBe(true);
  expect(await reserve("third@example.test", "b".repeat(64))).toBe(false);
  await db.exec("update public.demo_codes set revoked_at=now()");
  expect(await reserve("fourth@example.test")).toBe(false);
});
