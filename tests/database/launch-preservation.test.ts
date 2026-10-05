import { afterAll, beforeAll, expect, it } from "vitest";
import { createHash, randomUUID } from "node:crypto";
import { createTestDatabase } from "./database";
import { prepareLaunchMigration } from "../../scripts/prepare-launch-migration";

let db: Awaited<ReturnType<typeof createTestDatabase>>;
beforeAll(async () => { db = await createTestDatabase("202609300026_evaluation_foundation.sql"); });
afterAll(async () => { await db.close(); });

const oldTables = ["members", "research_profiles", "membership_bindings", "nft_tier_events", "research_questions",
  "findings", "finding_versions", "review_decisions", "award_ledger", "audit_events", "opportunities", "rank_demo_profiles"];
async function digest(table: string) {
  const rows = (await db.query<{ value: unknown }>(`select to_jsonb(t) as value from public.${table} t`)).rows.map((row) => JSON.stringify(row.value)).sort();
  return createHash("sha256").update(rows.join("\n")).digest("hex");
}

it("adds launch policy and tracking without rewriting populated pre-launch records or old read paths", async () => {
  const member = randomUUID();
  await db.query("insert into auth.users(id,email,email_confirmed_at) values($1,$2,now())", [member, `${member}@example.test`]);
  await db.query("insert into public.members(id,auth_user_id,email) values($1,$1,$2)", [member, `${member}@example.test`]);
  await db.query("insert into public.research_profiles(member_id,display_name,specialty,is_demo) values($1,'Unchanged isolated fixture','project',false)", [member]);
  await db.query("insert into public.wallet_challenges(id,member_id,address,nonce,domain,uri,message,expires_at) values($1,$1,$2,$3,'localhost','http://localhost','proof',now()+interval '5 minutes')", [member, `0x${"1".repeat(40)}`, member]);
  await db.query("select public.bind_verified_wallet($1,$1,'proof')", [member]);
  await db.exec("set role service_role");
  const binding = (await db.query<{ v: string }>("select public.bind_owned_token($1,$2,$3,$4,$5,$6) v", [member, `0x${"c".repeat(40)}`, "1", "1", "10", `0x${"e".repeat(64)}`])).rows[0]!.v;
  const before = await Promise.all(oldTables.map(digest));
  await db.exec("reset role");
  const transaction = await prepareLaunchMigration();
  await db.exec(transaction);
  await expect(db.exec(transaction)).rejects.toThrow(/already present/);
  await db.exec("rollback");
  const after = await Promise.all(oldTables.map(digest));
  expect(after).toEqual(before);
  await db.exec("set role service_role");
  const oldContext = (await db.query<{ v: string[] }>("select public.alpha_context_keys('Traders') v")).rows[0]!.v;
  expect(oldContext).toContain("setup");
  const snapshot = (await db.query<{ v: { launchAvailable: boolean; memberId: string; launchTerms: unknown[] } }>("select public.alpha_snapshot($1,$2,null) v", [member, binding])).rows[0]!.v;
  expect(snapshot.launchAvailable).toBe(true);
  expect(snapshot.launchTerms).toEqual([]);
});
