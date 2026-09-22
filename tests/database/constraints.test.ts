import { afterAll, afterEach, beforeAll, beforeEach, expect, it } from "vitest";
import { createTestDatabase } from "./database";

let db: Awaited<ReturnType<typeof createTestDatabase>>;
const member = "11111111-1111-4111-8111-111111111111";
const other = "22222222-2222-4222-8222-222222222222";
const challenge = "33333333-3333-4333-8333-333333333333";
const wallet = "44444444-4444-4444-8444-444444444444";
const address = `0x${"a".repeat(40)}`;
const contract = `0x${"b".repeat(40)}`;

beforeAll(async () => {
  db = await createTestDatabase();
  for (const [id, email] of [
    [member, "one@example.test"],
    [other, "two@example.test"],
  ]) {
    await db.query(
      "insert into auth.users(id, email, email_confirmed_at) values ($1, $2, now())",
      [id, email],
    );
    await db.query(
      "insert into public.members(id, auth_user_id, email) values ($1, $1, $2)",
      [id, email],
    );
  }
  await db.query(
    "insert into public.wallet_challenges(id, member_id, address, nonce, domain, uri, message, expires_at) values ($1, $2, $3, 'test-nonce-123456789', 'localhost:3000', 'http://localhost:3000', 'test proof', now() + interval '5 minutes')",
    [challenge, member, address],
  );
  await db.query(
    "insert into public.wallet_bindings(id, member_id, address, challenge_id) values ($1, $2, $3, $4)",
    [wallet, member, address, challenge],
  );
  await db.query(
    "insert into public.chain_operations(member_id, wallet_binding_id, contract_address, recipient_address, issuance_key) values ($1, $2, $3, $4, $5)",
    [member, wallet, contract, address, `0x${"2".repeat(64)}`],
  );
});
beforeEach(async () => {
  await db.exec("begin");
});
afterEach(async () => {
  await db.exec("rollback");
});
afterAll(async () => {
  await db?.close();
});

it("does not let one challenge bind a different member", async () => {
  await expect(
    db.query(
      "insert into public.wallet_bindings(member_id, address, challenge_id) values ($1, $2, $3)",
      [other, address, challenge],
    ),
  ).rejects.toThrow();
});

it("does not let an operation use another member's wallet", async () => {
  await expect(
    db.query(
      "insert into public.chain_operations(member_id, wallet_binding_id, contract_address, recipient_address, issuance_key) values ($1, $2, $3, $4, $5)",
      [other, wallet, contract, address, `0x${"1".repeat(64)}`],
    ),
  ).rejects.toThrow(/foreign key/);
});

it("allows only one issuance per member and contract", async () => {
  const args = [member, wallet, contract, address, `0x${"2".repeat(64)}`];
  await expect(
    db.query(
      "insert into public.chain_operations(member_id, wallet_binding_id, contract_address, recipient_address, issuance_key) values ($1, $2, $3, $4, $5)",
      [...args.slice(0, 4), `0x${"3".repeat(64)}`],
    ),
  ).rejects.toThrow(/unique constraint/);
});

it("does not bind a pending mint", async () => {
  const operation = (
    await db.query<{ id: string }>(
      "select id from public.chain_operations where member_id = $1",
      [member],
    )
  ).rows[0]!.id;
  await expect(
    db.query(
      "insert into public.membership_bindings(member_id, wallet_binding_id, contract_address, token_id, ownership_epoch, verified_block, verified_block_hash, mint_operation_id) values ($1, $2, $3, '1', '1', '1', $4, $5)",
      [member, wallet, contract, `0x${"c".repeat(64)}`, operation],
    ),
  ).rejects.toThrow(/confirmed mint/);
});

it("requires a receipt before recording confirmation", async () => {
  await expect(
    db.query(
      "update public.chain_operations set status = 'confirmed', token_id = '1' where member_id = $1",
      [member],
    ),
  ).rejects.toThrow(/check constraint/);
});
