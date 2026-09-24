import { afterAll, afterEach, beforeAll, beforeEach, expect, it } from "vitest";
import { createTestDatabase } from "./database";

let db: Awaited<ReturnType<typeof createTestDatabase>>;
const member = "11111111-1111-4111-8111-111111111111";
const other = "22222222-2222-4222-8222-222222222222";
const challenge = "33333333-3333-4333-8333-333333333333";
const address = `0x${"a".repeat(40)}`;

beforeAll(async () => {
  db = await createTestDatabase();
});
afterAll(async () => {
  await db?.close();
});
beforeEach(async () => {
  await db.exec("begin");
  await db.query(
    "insert into auth.users(id,email,email_confirmed_at) values($1,'a@example.test',now()),($2,'b@example.test',now())",
    [member, other],
  );
  await db.query(
    "insert into public.members(id,auth_user_id,email) values($1,$1,'a@example.test'),($2,$2,'b@example.test')",
    [member, other],
  );
  await issue();
});
afterEach(async () => {
  await db.exec("rollback; reset role");
});

async function issue(id = challenge, owner = member, wallet = address) {
  return db.query(
    "select public.issue_wallet_challenge($1,$2,$3,$4,'localhost:3000','http://localhost:3000/join','message',clock_timestamp(),clock_timestamp()+interval '4 minutes')",
    [id, owner, wallet, id.replaceAll("-", "")],
  );
}
async function bind(owner = member, id = challenge, message = "message") {
  return db.query("select public.bind_verified_wallet($1,$2,$3)", [
    owner,
    id,
    message,
  ]);
}
async function rejected(action: () => Promise<unknown>, pattern: RegExp) {
  await db.exec("savepoint rejected");
  await expect(action()).rejects.toThrow(pattern);
  await db.exec("rollback to savepoint rejected");
}

it("binds atomically, audits, consumes once, and grants no membership", async () => {
  await db.exec("set role service_role");
  await bind();
  expect(
    (await db.query("select * from public.wallet_bindings")).rows,
  ).toHaveLength(1);
  expect(
    (await db.query("select * from public.audit_events")).rows,
  ).toHaveLength(1);
  expect(
    (await db.query("select * from public.membership_bindings")).rows,
  ).toHaveLength(0);
  await rejected(() => bind(), /Challenge unavailable/);
});
it("rejects another member's challenge and changed message", async () => {
  await rejected(() => bind(other), /Challenge unavailable/);
  await rejected(
    () => bind(member, challenge, "different"),
    /Challenge unavailable/,
  );
});
it("rejects expiry at the database boundary", async () => {
  await db.exec(
    "update public.wallet_challenges set created_at=now()-interval '6 minutes', expires_at=now()-interval '1 minute'",
  );
  await rejected(() => bind(), /Challenge unavailable/);
});
it("invalidates older challenges when issuing a replacement", async () => {
  await issue(other);
  await rejected(() => bind(), /Challenge unavailable/);
  await bind(member, other);
});
it("limits challenges per member", async () => {
  for (let i = 4; i <= 7; i++)
    await issue(`${i}${"0".repeat(7)}-0000-4000-8000-000000000000`);
  await rejected(() => issue(other), /Challenge rate limit/);
});
it("prevents wallet sharing and rolls back failed consumption", async () => {
  await bind();
  await issue(other, other);
  await rejected(() => bind(other, other), /duplicate key/);
  expect(
    (
      await db.query(
        "select consumed_at from public.wallet_challenges where id=$1",
        [other],
      )
    ).rows[0],
  ).toEqual({ consumed_at: null });
});
it("does not silently replace a member's verified wallet", async () => {
  await bind();
  await issue(other, member, `0x${"b".repeat(40)}`);
  await rejected(() => bind(member, other), /Wallet already bound/);
});
for (const role of ["anon", "authenticated"])
  it(`denies ${role} wallet RPC access`, async () => {
    await db.exec(`set role ${role}`);
    await rejected(() => bind(), /permission denied/);
    await rejected(() => issue(other), /permission denied/);
    await rejected(
      () => db.query("select public.wallet_proof_clock()"),
      /permission denied/,
    );
  });

it("exposes authoritative database time only to the server", async () => {
  await db.exec("set role service_role");
  const result = await db.query<{ delta: number }>(
    "select abs(extract(epoch from (public.wallet_proof_clock() - clock_timestamp())))::float as delta",
  );
  expect(result.rows[0]!.delta).toBeLessThan(1);
});
