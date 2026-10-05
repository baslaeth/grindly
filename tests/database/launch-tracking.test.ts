import { afterAll, afterEach, beforeAll, beforeEach, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { createTestDatabase } from "./database";
import { categoryFields, checklistVersion } from "../../src/alpha/checklists";

let db: Awaited<ReturnType<typeof createTestDatabase>>;
const ids = [randomUUID(), randomUUID(), randomUUID()];
let bindings: string[] = [];
beforeAll(async () => { db = await createTestDatabase(); });
afterAll(async () => { await db.close(); });
beforeEach(async () => {
  await db.exec("begin"); bindings = [];
  for (const [i, id] of ids.entries()) {
    await db.query("insert into auth.users(id,email,email_confirmed_at) values($1,$2,now())", [id, `${id}@example.test`]);
    await db.query("insert into public.members(id,auth_user_id,email) values($1,$1,$2)", [id, `${id}@example.test`]);
    await db.query("insert into public.research_profiles(member_id,display_name,specialty,is_demo) values($1,$2,'project',true)", [id, `Tracking fixture ${i}`]);
    await db.query("insert into public.wallet_challenges(id,member_id,address,nonce,domain,uri,message,expires_at) values($1,$1,$2,$3,'localhost','http://localhost','proof',now()+interval '5 minutes')", [id, `0x${String(i + 1).repeat(40)}`, id]);
    await db.query("select public.bind_verified_wallet($1,$1,'proof')", [id]);
    bindings.push(await rpc<string>("bind_owned_token", [id, `0x${"c".repeat(40)}`, String(i + 1), "1", "10", `0x${"e".repeat(64)}`]));
  }
  await db.query("insert into public.member_roles(member_id,role) values($1,'steward')", [ids[0]]);
  await db.query("insert into public.promotion_decisions(member_id,membership_binding_id,chain_id,contract_address,token_id,ownership_epoch,approved_by,rationale,evidence) select member_id,id,chain_id,contract_address,token_id,ownership_epoch,$2,'Isolated Silver fixture','[{\"kind\":\"fixture\"}]' from public.membership_bindings where id=$1", [bindings[2], ids[0]]);
  await db.exec("set role service_role");
});
afterEach(async () => { await db.exec("rollback; reset role"); });
async function rpc<T>(name: string, args: unknown[]) {
  return (await db.query<{ v: T }>(`select public.${name}(${args.map((_, i) => `$${i + 1}`).join(",")}) v`, args)).rows[0]!.v;
}
async function denied(task: () => Promise<unknown>) {
  await db.exec("savepoint rejected"); await expect(task()).rejects.toThrow(/research:/); await db.exec("rollback to savepoint rejected");
}
it("appoints only a compatible reviewer in this rank and revokes the explicit scope", async () => {
  await denied(() => rpc("launch_set_reviewer", [ids[0], bindings[0], ids[0], "Traders", "Independent market evidence", true]));
  await denied(() => rpc("launch_set_reviewer", [ids[0], bindings[0], ids[2], "Traders", "Independent market evidence", true]));
  await rpc("launch_set_reviewer", [ids[0], bindings[0], ids[1], "Traders", "Independent market evidence", true]);
  expect((await db.query("select * from public.launch_reviewer_scopes where member_id=$1", [ids[1]])).rows).toHaveLength(1);
  await rpc("launch_set_reviewer", [ids[0], bindings[0], ids[1], "Traders", "Independent market evidence", false]);
  expect((await db.query("select * from public.launch_reviewer_scopes where member_id=$1", [ids[1]])).rows).toHaveLength(0);
  expect((await db.query("select event_type from public.audit_events where subject_id=$1 and event_type like 'launch.reviewer_%'", [ids[1]])).rows).toHaveLength(2);
});
it("does not let a different rank follow or inspect a private category alpha", async () => {
  const record = await rpc<{ id: string }>("alpha_submit_v2", [ids[1], bindings[1], randomUUID(), JSON.stringify({
    finding: null, previous: null, category: "Traders", type: "analysis", visibility: "members",
    claim: "Isolated Bronze market research with a private rank boundary", purpose: "Members can inspect the available evidence",
    addition: "I independently checked the dated public source", limitations: "The later outcome is not known",
    subject: "ETH", chain: "", contract: "", checklist: checklistVersion,
    details: Object.fromEntries(categoryFields.Traders.map((field) => [field.key, "Unknown"])),
    evidence: [{ kind: "link", value: "https://ethereum.org/en/", label: "Primary source" }],
    firstNoticed: null, horizon: null, checkCondition: "", sourceMessage: null, sourceRevision: null,
    relatedVersion: null, correction: null,
  })]);
  expect(await rpc<{ id: string }>("launch_follow_mutate", [ids[0], bindings[0], "alpha", record.id, "follow", "", "", null])).toHaveProperty("id");
  await denied(() => rpc("launch_follow_mutate", [ids[2], bindings[2], "alpha", record.id, "follow", "", "", null]));
  const silver = await rpc<{ follows: unknown[] }>("alpha_snapshot", [ids[2], bindings[2], "silver-traders"]);
  expect(silver.follows).toHaveLength(0);
});
it("follows a sample opportunity, runs a due check, queues one changed page and notifies only after confirmation", async () => {
  const opportunity = (await db.query<{ id: string }>("select id from public.opportunities where name='Sample: public briefing'")).rows[0]!.id;
  await rpc("launch_follow_mutate", [ids[1], bindings[1], "opportunity", opportunity, "participated", "Read the public briefing", "Check the source", null]);
  const url = "https://docs.cdp.coinbase.com/api-reference/exchange-api/rest-api/products/get-product-candles";
  const source = await rpc<string>("launch_set_monitor_source", [ids[0], bindings[0], opportunity, url, 24, true]);
  expect((await rpc<{ status: string }>("launch_monitor_ingest", [source, "retrieved", "a".repeat(64), null, "First official page retrieval"])).status).toBe("no_new_confirmed_event");
  await db.query("update public.launch_monitor_sources set next_due=now()-interval '1 minute' where id=$1", [source]);
  const changed = await rpc<{ status: string; event: string }>("launch_monitor_ingest", [source, "retrieved", "b".repeat(64), null, "Changed official page retrieval"]);
  expect(changed.status).toBe("change_queued");
  expect((await db.query("select * from public.launch_notifications")).rows).toHaveLength(0);
  expect(await rpc<number>("launch_confirm_event", [ids[0], bindings[0], changed.event, true, "Published participation terms changed", "Recheck eligibility", null, "urgent"])).toBe(1);
  expect((await db.query("select * from public.launch_notifications")).rows).toHaveLength(1);
  const notification = (await db.query<{ id: string }>("select id from public.launch_notifications where member_id=$1", [ids[1]])).rows[0]!.id;
  await denied(() => rpc("launch_notification_mutate", [ids[0], bindings[0], notification, "acknowledge"]));
  await rpc("launch_notification_mutate", [ids[1], bindings[1], notification, "acknowledge"]);
  expect((await db.query<{ status: string }>("select status from public.launch_notifications where id=$1", [notification])).rows[0]!.status).toBe("acknowledged");
  await denied(() => rpc("launch_confirm_event", [ids[0], bindings[0], changed.event, true, "Published participation terms changed", "Recheck eligibility", null, "urgent"]));
});

it("holds nonurgent events for one daily digest and sends a due reminder once", async () => {
  const opportunity = (await db.query<{ id: string }>("select id from public.opportunities where name='Sample: public briefing'")).rows[0]!.id;
  const deadline = new Date(Date.now() + 12 * 3600000).toISOString();
  await rpc("launch_follow_mutate", [ids[1], bindings[1], "opportunity", opportunity, "follow", "", "Check the source", deadline]);
  await rpc("launch_watch_preferences_set", [ids[1], bindings[1], true, true]);
  const source = await rpc<string>("launch_set_monitor_source", [ids[0], bindings[0], opportunity, "https://docs.cdp.coinbase.com/api-reference/exchange-api/rest-api/products/get-product-candles", 24, true]);
  await rpc("launch_monitor_ingest", [source, "retrieved", "a".repeat(64), null, "First source retrieval"]);
  await db.query("update public.launch_monitor_sources set next_due=now()-interval '1 minute' where id=$1", [source]);
  const event = await rpc<{ event: string }>("launch_monitor_ingest", [source, "retrieved", "b".repeat(64), null, "Changed source retrieval"]);
  await rpc("launch_confirm_event", [ids[0], bindings[0], event.event, true, "Public participation date changed", "Review the new deadline", null, "nonurgent"]);
  expect((await db.query<{ delivered_at: string | null }>("select delivered_at from public.launch_notifications where event_id=$1", [event.event])).rows[0]!.delivered_at).toBeNull();
  const room = (await db.query<{ id: string }>("select id from public.research_questions where rank='Bronze' and category='General'")).rows[0]!.id;
  const before = await rpc<{ notifications: unknown[] }>("alpha_snapshot", [ids[1], bindings[1], room]);
  expect(before.notifications).toHaveLength(0);
  expect(await rpc<number>("launch_deliver_digest", [])).toBe(1);
  expect(await rpc<number>("launch_deliver_digest", [])).toBe(0);
  const after = await rpc<{ notifications: { batch_at: string | null }[] }>("alpha_snapshot", [ids[1], bindings[1], room]);
  expect(after.notifications).toHaveLength(1);
  expect(after.notifications[0]!.batch_at).toBeTruthy();
  expect(await rpc<number>("launch_due_reminders", [])).toBe(1);
  expect(await rpc<number>("launch_due_reminders", [])).toBe(0);
  expect((await db.query("select id from public.launch_notifications where kind='deadline' and member_id=$1", [ids[1]])).rows).toHaveLength(1);
});
