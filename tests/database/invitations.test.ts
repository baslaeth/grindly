import { afterAll, afterEach, beforeAll, beforeEach, expect, it } from "vitest";
import { createTestDatabase } from "./database";

let db: Awaited<ReturnType<typeof createTestDatabase>>;
const userId = "11111111-1111-4111-8111-111111111111";
const otherId = "22222222-2222-4222-8222-222222222222";
const hash = "a".repeat(64);

beforeAll(async () => {
  db = await createTestDatabase();
});
afterAll(async () => {
  await db?.close();
});
beforeEach(async () => {
  await db.exec("begin");
  await db.query(
    "insert into auth.users(id, email, email_confirmed_at) values ($1, 'invited@example.test', now()), ($2, 'other@example.test', now())",
    [userId, otherId],
  );
  await db.query(
    "insert into public.invitations(token_hash, email, expires_at) values ($1, 'invited@example.test', now() + interval '1 day')",
    [hash],
  );
});
afterEach(async () => {
  await db.exec("rollback; reset role");
});

async function redeem(id = userId, tokenHash = hash) {
  return db.query<{ id: string }>(
    "select public.redeem_invitation($1, $2) as id",
    [tokenHash, id],
  );
}

async function assertUnavailable(id = userId, tokenHash = hash) {
  await db.exec("savepoint rejected_redemption");
  await expect(redeem(id, tokenHash)).rejects.toThrow(/Invitation unavailable/);
  await db.exec("rollback to savepoint rejected_redemption");
  expect((await db.query("select * from public.members")).rows).toHaveLength(0);
  expect(
    (await db.query("select * from public.audit_events")).rows,
  ).toHaveLength(0);
}

it("redeems an invited, verified email once without granting NFT membership", async () => {
  await db.exec("set role service_role");
  const result = await redeem();
  const memberId = result.rows[0]!.id;
  expect(
    (await db.query("select redeemed_by from public.invitations")).rows[0],
  ).toEqual({ redeemed_by: memberId });
  expect(
    (await db.query("select * from public.audit_events")).rows,
  ).toHaveLength(1);
  expect(
    (await db.query("select * from public.membership_bindings")).rows,
  ).toHaveLength(0);
  expect(
    (await db.query("select * from public.member_roles")).rows,
  ).toHaveLength(0);
  await db.exec("savepoint second_redemption");
  await expect(redeem()).rejects.toThrow(/Invitation unavailable/);
  await db.exec("rollback to savepoint second_redemption");
  expect((await db.query("select * from public.members")).rows).toHaveLength(1);
  expect(
    (await db.query("select * from public.audit_events")).rows,
  ).toHaveLength(1);
});

it("rejects the wrong verified email", async () => {
  await assertUnavailable(otherId);
});
it("rejects unknown invitation codes", async () => {
  await assertUnavailable(userId, "b".repeat(64));
});
it("rejects unverified auth users", async () => {
  await db.query(
    "update auth.users set email_confirmed_at = null where id = $1",
    [userId],
  );
  await assertUnavailable();
});
it("rejects expired invitations", async () => {
  await db.exec(
    "update public.invitations set created_at = now() - interval '2 days', expires_at = now() - interval '1 day'",
  );
  await assertUnavailable();
});
it("rejects revoked invitations", async () => {
  await db.exec("update public.invitations set revoked_at = now()");
  await assertUnavailable();
});
it("enforces configurable OTP cooldown and request limits", async () => {
  const reserve = () =>
    db.query<{ allowed: boolean }>(
      "select public.reserve_invitation_otp($1, $2, 60, 2) as allowed",
      [hash, "invited@example.test"],
    );
  expect((await reserve()).rows[0]?.allowed).toBe(true);
  expect((await reserve()).rows[0]?.allowed).toBe(false);
  await db.exec(
    "update public.invitations set last_otp_at = now() - interval '61 seconds'",
  );
  expect((await reserve()).rows[0]?.allowed).toBe(true);
  await db.exec(
    "update public.invitations set last_otp_at = now() - interval '61 seconds'",
  );
  expect((await reserve()).rows[0]?.allowed).toBe(false);
});
it("does not consume OTP quota for the wrong email", async () => {
  expect(
    (
      await db.query<{ allowed: boolean }>(
        "select public.reserve_invitation_otp($1, $2) as allowed",
        [hash, "wrong@example.test"],
      )
    ).rows[0]?.allowed,
  ).toBe(false);
  expect(
    (await db.query("select otp_requests from public.invitations")).rows[0],
  ).toEqual({ otp_requests: 0 });
});
for (const role of ["anon", "authenticated"]) {
  it(`${role} cannot redeem an invitation through direct RPC`, async () => {
    await db.exec(`set role ${role}`);
    await expect(redeem()).rejects.toThrow(/permission denied/);
  });
}
