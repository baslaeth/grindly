import { afterAll, afterEach, beforeAll, beforeEach, expect, it } from "vitest";
import { createTestDatabase } from "./database";
let db: Awaited<ReturnType<typeof createTestDatabase>>;
const alice = "11111111-1111-4111-8111-111111111111";
const bob = "22222222-2222-4222-8222-222222222222";
const contract = `0x${"c".repeat(40)}`;
const issuer = `0x${"d".repeat(40)}`;
const hash = `0x${"e".repeat(64)}`;
beforeAll(async () => {
  db = await createTestDatabase();
});
afterAll(async () => {
  await db?.close();
});
beforeEach(async () => {
  await db.exec("begin");
  for (const [id, address, email] of [
    [alice, `0x${"a".repeat(40)}`, "a@example.test"],
    [bob, `0x${"b".repeat(40)}`, "b@example.test"],
  ]) {
    await db.query(
      "insert into auth.users(id,email,email_confirmed_at) values($1,$2,now())",
      [id, email],
    );
    await db.query(
      "insert into public.members(id,auth_user_id,email) values($1,$1,$2)",
      [id, email],
    );
    await db.query(
      "insert into public.wallet_challenges(id,member_id,address,nonce,domain,uri,message,expires_at) values($1,$1,$2,$3,'localhost','http://localhost','proof',now()+interval '5 minutes')",
      [id, address, id],
    );
    await db.query("select public.bind_verified_wallet($1,$1,'proof')", [id]);
  }
  await db.exec("set role service_role");
});
afterEach(async () => {
  await db.exec("rollback;reset role");
});
async function operation(member = alice) {
  return (
    await db.query<{ id: string }>(
      "select public.create_mint_operation($1,$2,$3) as id",
      [member, contract, `0x${member.replaceAll("-", "").repeat(2)}`],
    )
  ).rows[0]!.id;
}
async function nonce(id: string, pending = 1) {
  return (
    await db.query<{ nonce: number }>(
      "select public.allocate_mint_nonce($1,$2,$3) as nonce",
      [id, issuer, pending],
    )
  ).rows[0]!.nonce;
}
async function bind(
  member = alice,
  epoch = "1",
  block = "10",
  mint: string | null = null,
) {
  return db.query("select public.bind_owned_token($1,$2,'1',$3,$4,$5,$6)", [
    member,
    contract,
    epoch,
    block,
    hash,
    mint,
  ]);
}
async function reject(action: () => Promise<unknown>, pattern: RegExp) {
  await db.exec("savepoint rejected");
  await expect(action()).rejects.toThrow(pattern);
  await db.exec("rollback to savepoint rejected");
}

it("creates one durable operation per member and contract", async () => {
  expect(await operation()).toBe(await operation());
  expect(
    (await db.query("select * from public.chain_operations")).rows,
  ).toHaveLength(1);
});
it("reserves unique issuer nonces and preserves a reservation on retry", async () => {
  const a = await operation();
  const b = await operation(bob);
  expect(Number(await nonce(a))).toBe(1);
  expect(Number(await nonce(a, 90))).toBe(1);
  expect(Number(await nonce(b))).toBe(2);
});
it("starts at the pending chain nonce and rejects issuer changes", async () => {
  const a = await operation();
  expect(Number(await nonce(a, 8))).toBe(8);
  await reject(
    () => db.query("select public.allocate_mint_nonce($1,$2,9)", [a, contract]),
    /Issuer mismatch/,
  );
});
it("requires a nonce before persisting and keeps the first signed transaction", async () => {
  const a = await operation();
  await reject(
    () =>
      db.query("select public.persist_mint_transaction($1,'0x1234',$2)", [
        a,
        hash,
      ]),
    /Nonce required/,
  );
  await nonce(a);
  await db.query("select public.persist_mint_transaction($1,'0x1234',$2)", [
    a,
    hash,
  ]);
  await db.query("select public.persist_mint_transaction($1,'0x5678',$2)", [
    a,
    `0x${"f".repeat(64)}`,
  ]);
  expect(
    (
      await db.query(
        "select signed_transaction,status from public.chain_operations",
      )
    ).rows[0],
  ).toEqual({ signed_transaction: "0x1234", status: "signed" });
});
it("pending and reverted mint operations never bind membership", async () => {
  const a = await operation();
  await reject(() => bind(alice, "1", "10", a), /matching confirmed mint/);
  await nonce(a);
  await db.query("select public.persist_mint_transaction($1,'0x1234',$2)", [
    a,
    hash,
  ]);
  await db.query(
    "update public.chain_operations set status='reverted',receipt_block='10',receipt_block_hash=$1 where id=$2",
    [hash, a],
  );
  await reject(() => bind(alice, "1", "10", a), /matching confirmed mint/);
});
it("recipient rebinding revokes sender binding but keeps member identities", async () => {
  await bind();
  await bind(bob, "2", "11");
  const bindings = (
    await db.query<{ member_id: string; revoked_at: unknown }>(
      "select member_id,revoked_at from public.membership_bindings order by bound_at",
    )
  ).rows;
  expect(bindings).toHaveLength(2);
  expect(
    bindings.find((x) => x.member_id === alice)!.revoked_at,
  ).not.toBeNull();
  expect(bindings.find((x) => x.member_id === bob)!.revoked_at).toBeNull();
  expect((await db.query("select * from public.members")).rows).toHaveLength(2);
});
it("rejects stale or conflicting observations during rebinding", async () => {
  await bind(bob, "2", "11");
  await reject(() => bind(alice, "1", "10"), /Stale ownership/);
  await reject(() => bind(alice, "2", "12"), /Conflicting ownership/);
});
it("transfer back creates a fresh binding and same-epoch retry is idempotent", async () => {
  await bind();
  await bind(bob, "2", "11");
  await bind(alice, "3", "12");
  await bind(alice, "3", "13");
  expect(
    (await db.query("select * from public.membership_bindings")).rows,
  ).toHaveLength(3);
});
it("preserves nonempty identities, roles, audit history and promotion attribution across transfer-back", async () => {
  await bind();
  await db.query(
    "insert into public.member_roles(member_id,role) values($1,'steward')",
    [bob],
  );
  await db.query(
    'insert into public.audit_events(actor_member_id,event_type,details) values($1,\'qa.fixture\', \'{"demo":true,"note":"alice history"}\'),($2,\'qa.fixture\',\'{"demo":true,"note":"bob history"}\')',
    [alice, bob],
  );
  await db.query(
    `insert into public.promotion_decisions(member_id,membership_binding_id,chain_id,contract_address,token_id,ownership_epoch,approved_by,rationale,evidence)
    select member_id,id,chain_id,contract_address,token_id,ownership_epoch,$1,'Explicit automated QA fixture','[{"demo":true}]'::jsonb
    from public.membership_bindings where member_id=$2 and revoked_at is null`,
    [bob, alice],
  );
  const members = (await db.query("select * from public.members order by id"))
    .rows;
  const roles = (
    await db.query("select * from public.member_roles order by member_id,role")
  ).rows;
  const history = (
    await db.query(
      "select * from public.audit_events where event_type='qa.fixture' order by id",
    )
  ).rows;
  const promotions = (
    await db.query("select * from public.promotion_decisions")
  ).rows;
  expect(history).toHaveLength(2);
  expect(promotions).toHaveLength(1);
  await bind(bob, "2", "11");
  await bind(alice, "3", "12");
  expect(
    (await db.query("select * from public.members order by id")).rows,
  ).toEqual(members);
  expect(
    (
      await db.query(
        "select * from public.member_roles order by member_id,role",
      )
    ).rows,
  ).toEqual(roles);
  expect(
    (
      await db.query(
        "select * from public.audit_events where event_type='qa.fixture' order by id",
      )
    ).rows,
  ).toEqual(history);
  expect(
    (await db.query("select * from public.promotion_decisions")).rows,
  ).toEqual(promotions);
  expect(
    (
      await db.query(`select p.id from public.promotion_decisions p join public.membership_bindings b
    on b.id=p.membership_binding_id and b.member_id=p.member_id and b.ownership_epoch=p.ownership_epoch
    where b.revoked_at is null and p.revoked_at is null`)
    ).rows,
  ).toHaveLength(0);
});
for (const role of ["anon", "authenticated"])
  it(`denies ${role} issuance and binding RPCs`, async () => {
    await db.exec(`set role ${role}`);
    await reject(() => operation(), /permission denied/);
    await reject(() => nonce(alice), /permission denied/);
    await reject(
      () =>
        db.query("select public.persist_mint_transaction($1,'0x1234',$2)", [
          alice,
          hash,
        ]),
      /permission denied/,
    );
    await reject(() => bind(), /permission denied/);
  });
