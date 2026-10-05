import { afterAll, afterEach, beforeAll, beforeEach, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { createTestDatabase } from "./database";
import { categoryFields, checklistVersion } from "../../src/alpha/checklists";
import { launchPolicy } from "../../src/launch/policy";

let db: Awaited<ReturnType<typeof createTestDatabase>>;
const ids = [randomUUID(), randomUUID(), randomUUID()];
let bindings: string[] = [];
beforeAll(async () => { db = await createTestDatabase(); });
afterAll(async () => { await db.close(); });
beforeEach(async () => {
  await db.exec("begin");
  bindings = [];
  for (const [i, id] of ids.entries()) {
    await db.query("insert into auth.users(id,email,email_confirmed_at) values($1,$2,now())", [id, `${id}@example.test`]);
    await db.query("insert into public.members(id,auth_user_id,email) values($1,$1,$2)", [id, `${id}@example.test`]);
    await db.query("insert into public.research_profiles(member_id,display_name,specialty,is_demo) values($1,$2,'project',true)", [id, `Launch fixture ${i}`]);
    await db.query("insert into public.wallet_challenges(id,member_id,address,nonce,domain,uri,message,expires_at) values($1,$1,$2,$3,'localhost','http://localhost','proof',now()+interval '5 minutes')", [id, `0x${String(i + 1).repeat(40)}`, id]);
    await db.query("select public.bind_verified_wallet($1,$1,'proof')", [id]);
    bindings.push(await rpc<string>("bind_owned_token", [id, `0x${"c".repeat(40)}`, String(i + 1), "1", "10", `0x${"e".repeat(64)}`]));
  }
  await db.query("insert into public.member_roles(member_id,role) values($1,'reviewer')", [ids[1]]);
  await db.query("insert into public.alpha_reviewer_scopes(member_id,category,scope,granted_by) values($1,'Traders','Independent launch review scope',$1)", [ids[1]]);
  await db.query("insert into public.launch_reviewer_scopes(member_id,category,rank,scope,granted_by) values($1,'Traders','Bronze','Independent launch review scope',$1)", [ids[1]]);
  await db.exec("set role service_role");
});
afterEach(async () => { await db.exec("rollback; reset role"); });
async function rpc<T>(name: string, args: unknown[]) {
  return (await db.query<{ v: T }>(`select public.${name}(${args.map((_, i) => `$${i + 1}`).join(",")}) v`, args)).rows[0]!.v;
}
async function denied(task: () => Promise<unknown>) {
  await db.exec("savepoint rejected");
  await expect(task()).rejects.toThrow(/research:/);
  await db.exec("rollback to savepoint rejected");
}
const context = Object.fromEntries(["asset", "venue", "direction", "entry", "stop", "target", "expiry", "instrument", "setup"].map((key) => [key, "Unknown"]));
const supportedMarketContext = { ...context, asset: "ETH", venue: "Coinbase Exchange", instrument: "Spot" };
const futureMarketHour = () => new Date(Math.ceil((Date.now() + 48 * 3600000) / 3600000) * 3600000).toISOString();
function payload(overrides: Record<string, unknown> = {}) {
  return {
    finding: null, previous: null, category: "Traders", type: "analysis", visibility: "members",
    claim: "A useful independent analysis of the recorded market setup", purpose: "Members can inspect the documented setup",
    addition: "I independently checked the primary evidence", limitations: "Price outcomes are not yet known",
    subject: "ETH", chain: "", contract: "", checklist: checklistVersion,
    details: Object.fromEntries(categoryFields.Traders.map((f) => [f.key, "Unknown"])),
    evidence: [{ kind: "link", value: "https://ethereum.org/en/", label: "Primary documentation" }],
    firstNoticed: null, horizon: null, checkCondition: "", sourceMessage: null, sourceRevision: null,
    relatedVersion: null, correction: null,
    launch: { policyVersion: launchPolicy.version, opportunity: "ETH research", usefulAction: "Check the source before acting", costOrRisk: "Market risk is unknown", context, prediction: null },
    ...overrides,
  };
}
const submit = (data: Record<string, unknown> = payload(), request = randomUUID(), member = 0) => rpc<{ id: string; version: string; alreadyRecorded?: boolean }>("launch_submit", [ids[member], bindings[member], request, JSON.stringify(data)]);
async function decide(version: string, workClass: "none" | "actionable" | "tested" | "substantial", reviewer = 1, decision = "accept") {
  const assignment = (await db.query<{ id: string }>("select id from public.review_assignments where version_id=$1 and reviewer_id=$2 and completed_at is null", [version, ids[reviewer]])).rows[0]!.id;
  const assessment = Object.fromEntries(["evidence", "relevance", "addition", "limitations", "alternatives"].map((key) => [key, "Independent evidence checked with recorded limits"]));
  return rpc<{ workXp: number }>("launch_decide", [ids[reviewer], bindings[reviewer], version, assignment, decision,
    "Independent review of the saved evidence and claim", "No conflicting interest", true, checklistVersion, JSON.stringify(assessment), workClass]);
}

it("registers immutable policy terms and enforces three new alphas per member-day with idempotent retry", async () => {
  const key = randomUUID();
  const first = await submit(payload(), key);
  expect((await submit(payload(), key)).version).toBe(first.version);
  await submit();
  await submit();
  await denied(() => submit());
  const rows = await db.query("select count(*)::int as count from public.launch_submission_terms where member_id=$1", [ids[0]]);
  expect(rows.rows[0]).toEqual({ count: 3 });
  const s = await rpc<{ launchAvailable: boolean; launchAllowance: { dailyRemaining: number } }>("alpha_snapshot", [ids[0], bindings[0], "bronze-traders"]);
  expect(s.launchAvailable).toBe(true);
  expect(s.launchAllowance.dailyRemaining).toBe(0);
});

it("requires an independent scoped decision, awards one work amount and preserves retry identity", async () => {
  const record = await submit();
  const assignment = (await db.query<{ id: string }>("select id from public.review_assignments where version_id=$1", [record.version])).rows[0]!.id;
  const assessment = Object.fromEntries(["evidence", "relevance", "addition", "limitations", "alternatives"].map((key) => [key, "Evidence checked independently with limits"]));
  const args = [ids[1], bindings[1], record.version, assignment, "accept", "Independent evidence supports a tested guide", "No conflicting interest", true, checklistVersion, JSON.stringify(assessment), "tested"];
  await denied(() => rpc("launch_decide", [ids[0], bindings[0], ...args.slice(2)]));
  const result = await rpc<{ workXp: number }>("launch_decide", args);
  expect(result.workXp).toBe(150);
  expect((await rpc<{ workXp: number }>("launch_decide", args)).workXp).toBe(150);
  const events = await db.query<{ xp: number }>("select xp from public.launch_xp_events where finding_id=$1", [record.id]);
  expect(events.rows).toEqual([{ xp: 150 }]);
  const legacy = await db.query("select id from public.award_ledger where finding_id=$1", [record.id]);
  expect(legacy.rows).toHaveLength(0);
});

it("keeps incomplete predictions unscored and rejects unfunded High reservations", async () => {
  const incomplete = payload({ type: "prediction", launch: { ...payload().launch, prediction: { commitment: "normal", predictionClass: "standard", baseline: "Unknown", target: "Unknown", invalidation: "Unknown", sourceType: "unknown" } } });
  const saved = await submit(incomplete);
  expect((await db.query<{ prediction_validated: boolean }>("select prediction_validated from public.launch_submission_terms where version_id=$1", [saved.version])).rows[0]!.prediction_validated).toBe(false);
  const high = payload({ type: "prediction", horizon: futureMarketHour(), checkCondition: "Target 120 or stop 90", launch: { ...payload().launch, context: supportedMarketContext, prediction: { commitment: "high", predictionClass: "standard", baseline: "100", target: "120", invalidation: "Stop 90", direction: "long", entry: "100", stop: "90", sourceType: "public_research" } } });
  await denied(() => submit(high));
});

it("accepts non-price criteria and rejects an enhanced window shorter than 30 days", async () => {
  const metaContext = Object.fromEntries(["theme", "projects", "earlyEvidence", "whyNow", "target", "invalidation", "horizon"].map((key) => [key, "Unknown"]));
  const shared = payload({ category: "Meta Catchers", subject: "Usage of a new public protocol feature",
    details: Object.fromEntries(categoryFields["Meta Catchers"].map((field) => [field.key, "Unknown"])),
    horizon: "2030-06-01T00:00:00Z", checkCondition: "Check the published monthly active user count against the original baseline" });
  const prediction = { commitment: "normal", predictionClass: "standard", baseline: "40 monthly active users",
    target: "100 monthly active users", invalidation: "Fewer than 100 monthly active users by the deadline",
    sourceType: "public_research" };
  const record = await submit({ ...shared, launch: { ...payload().launch, context: metaContext, prediction } });
  expect((await db.query<{ prediction_validated: boolean }>("select prediction_validated from public.launch_submission_terms where version_id=$1", [record.version])).rows[0]!.prediction_validated).toBe(true);
  const enhanced = await submit({ ...shared, claim: "A separate, shorter enhanced-window claim for the same documented theme",
    launch: { ...payload().launch, context: metaContext, prediction: { ...prediction, predictionClass: "enhanced", startsAt: "2030-05-20T00:00:00Z" } } });
  expect((await db.query<{ prediction_validated: boolean }>("select prediction_validated from public.launch_submission_terms where version_id=$1", [enhanced.version])).rows[0]!.prediction_validated).toBe(false);
});

it("does not consume a new-alpha slot for a linked material update", async () => {
  const first = await submit();
  await submit();
  await submit();
  const update = await submit(payload({ type: "update", relatedVersion: first.version,
    claim: "A separate material update to the earlier documented opportunity" }));
  expect((await db.query<{ is_new_alpha: boolean }>("select is_new_alpha from public.launch_submission_terms where version_id=$1", [update.version])).rows[0]!.is_new_alpha).toBe(false);
  await denied(() => submit());
});

it("reserves High XP once, records a signed loss after due review, and never pays twice", async () => {
  const work = await submit();
  expect((await decide(work.version, "actionable")).workXp).toBe(50);
  const high = payload({ type: "prediction", horizon: futureMarketHour(), checkCondition: "Entry 100, target 120 before stop 90",
    launch: { ...payload().launch, context: supportedMarketContext, prediction: { commitment: "high", predictionClass: "standard", baseline: "100", target: "120",
      invalidation: "Stop 90", direction: "long", entry: "100", stop: "90", sourceType: "public_research" } } });
  const call = await submit(high);
  expect((await db.query<{ amount: number }>("select amount from public.launch_high_reservations where version_id=$1 and released_at is null", [call.version])).rows[0]!.amount).toBe(50);
  await denied(() => submit(high));
  expect((await decide(call.version, "none")).workXp).toBe(0);
  // Only an isolated fixture clock is advanced. No live prediction is backdated.
  await db.exec("reset role");
  await db.exec("alter table public.alpha_versions disable trigger immutable_record");
  await db.query("update public.alpha_versions set created_at=now()-interval '3 hours',horizon=now()-interval '1 hour' where version_id=$1", [call.version]);
  await db.exec("alter table public.alpha_versions enable trigger immutable_record");
  await db.exec("set role service_role");
  const request = randomUUID();
  const observation = { status: "known", relation: "not_met", facts: "The registered stop preceded the target.",
    explanation: "The observed path reached the stop before the registered target.", uncertainty: "One venue only",
    observedAt: new Date().toISOString(), sources: [{ url: "https://api.exchange.coinbase.com/", label: "Coinbase", publishedAt: null }],
    conflicts: "No relevant conflict", conflictFree: true, marketStatus: "Failed", marketEvidence: { source: "fixture" } };
  const result = await rpc<{ status: string; outcomeXp: number }>("launch_assess_outcome", [ids[1], bindings[1], call.version, request, JSON.stringify(observation)]);
  expect(result).toMatchObject({ status: "Failed", outcomeXp: -50 });
  expect((await rpc<{ outcomeXp: number }>("launch_assess_outcome", [ids[1], bindings[1], call.version, request, JSON.stringify(observation)])).outcomeXp).toBe(-50);
  expect((await db.query("select version_id from public.launch_high_reservations where version_id=$1 and released_at is null", [call.version])).rows).toHaveLength(0);
  expect((await db.query<{ xp: number }>("select xp from public.launch_xp_events where version_id=$1", [call.version])).rows).toEqual([{ xp: -50 }]);
});

it("requires a separate scoped reviewer and source for an append-only reversal", async () => {
  const record = await submit();
  await decide(record.version, "tested");
  await db.query("insert into public.member_roles(member_id,role) values($1,'reviewer')", [ids[2]]);
  await db.query("insert into public.alpha_reviewer_scopes(member_id,category,scope,granted_by) values($1,'Traders','Second independent reviewer',$1)", [ids[2]]);
  await db.query("insert into public.launch_reviewer_scopes(member_id,category,rank,scope,granted_by) values($1,'Traders','Bronze','Second independent reviewer',$1)", [ids[2]]);
  const award = (await db.query<{ id: string }>("select id from public.launch_xp_events where version_id=$1 and kind='work'", [record.version])).rows[0]!.id;
  const args = [ids[2], bindings[2], award, "A documented material factual error requires reversal", JSON.stringify([{ url: "https://ethereum.org/en/" }])];
  await denied(() => rpc("launch_reverse_work", [ids[1], bindings[1], ...args.slice(2)]));
  await denied(() => rpc("launch_reverse_work", [ids[0], bindings[0], ...args.slice(2)]));
  expect(await rpc<{ xp: number }>("launch_reverse_work", args)).toMatchObject({ xp: -150 });
  expect(await rpc<{ alreadyRecorded: boolean }>("launch_reverse_work", args)).toMatchObject({ alreadyRecorded: true });
  expect((await db.query<{ xp: number }>("select xp from public.launch_xp_events where finding_id=$1 order by created_at", [record.id])).rows.map((r) => r.xp).sort()).toEqual([-150, 150]);
});

it("keeps the original decision and XP visible through a later independent appeal", async () => {
  const record = await submit();
  await decide(record.version, "actionable");
  await db.query("insert into public.member_roles(member_id,role) values($1,'reviewer')", [ids[2]]);
  await db.query("insert into public.alpha_reviewer_scopes(member_id,category,scope,granted_by) values($1,'Traders','Second independent reviewer',$1)", [ids[2]]);
  await db.query("insert into public.launch_reviewer_scopes(member_id,category,rank,scope,granted_by) values($1,'Traders','Bronze','Second independent reviewer',$1)", [ids[2]]);
  await rpc("alpha_appeal", [ids[0], bindings[0], record.version, "Source interpretation merits another independent review"]);
  expect((await decide(record.version, "none", 2, "reject")).workXp).toBe(0);
  const decisions = await db.query("select id from public.review_decisions where version_id=$1", [record.version]);
  expect(decisions.rows).toHaveLength(2);
  expect((await db.query<{ xp: number }>("select xp from public.launch_xp_events where version_id=$1", [record.version])).rows).toEqual([{ xp: 50 }]);
});

it("keeps earned progression with its author when the NFT binding transfers", async () => {
  const record = await submit();
  await decide(record.version, "tested");
  expect(await rpc<number>("launch_available_progress", [ids[0]])).toBe(150);
  const buyerBinding = await rpc<string>("bind_owned_token", [ids[2], `0x${"c".repeat(40)}`, "1", "2", "20", `0x${"f".repeat(64)}`]);
  expect(await rpc<number>("launch_available_progress", [ids[0]])).toBe(150);
  expect(await rpc<number>("launch_available_progress", [ids[2]])).toBe(0);
  await denied(() => rpc("alpha_snapshot", [ids[0], bindings[0], "bronze-traders"]));
  const buyer = await rpc<{ launchProgress: { available: number } }>("alpha_snapshot", [ids[2], buyerBinding, "bronze-traders"]);
  expect(buyer.launchProgress.available).toBe(0);
});

it("does not reuse an unreconciled historical promotion for High commitment", async () => {
  const record = await submit();
  await decide(record.version, "tested");
  await db.exec("reset role");
  await db.query("insert into public.member_roles(member_id,role) values($1,'steward')", [ids[2]]);
  await db.query(`insert into public.promotion_decisions(member_id,membership_binding_id,chain_id,contract_address,token_id,ownership_epoch,approved_by,rationale,evidence)
    select member_id,id,chain_id,contract_address,token_id,ownership_epoch,$2,'Isolated earlier tier advancement','[{"kind":"isolated-fixture"}]'::jsonb
    from public.membership_bindings where id=$1`, [bindings[0], ids[2]]);
  await db.exec("set role service_role");
  const snapshot = await rpc<{ launchProgress: { unreconciledHistory: boolean } }>("alpha_snapshot", [ids[0], bindings[0], "silver-traders"]);
  expect(snapshot.launchProgress.unreconciledHistory).toBe(true);
  const high = payload({ type: "prediction", horizon: futureMarketHour(), checkCondition: "Target 120 or stop 90",
    launch: { ...payload().launch, context: supportedMarketContext,
      prediction: { commitment: "high", predictionClass: "standard", baseline: "100", target: "120", invalidation: "Stop 90", direction: "long", entry: "100", stop: "90", sourceType: "public_research" } } });
  await denied(() => submit(high));
});

it("caps ordinary work at 900 per UTC week without reopening allowance after a reversal", async () => {
  const records = [];
  for (let i = 0; i < 3; i++) {
    const record = await submit(payload({ claim: `Isolated independent analysis number ${i} with dated evidence` }));
    records.push(record);
    expect((await decide(record.version, "substantial")).workXp).toBe(300);
  }
  const update = await submit(payload({ type: "update", relatedVersion: records[0]!.version,
    claim: "A separate material update with a dated change in requirements" }));
  const over = await decide(update.version, "actionable");
  expect(over.workXp).toBe(0);
  expect(await rpc<number>("launch_ordinary_remaining", [ids[0]])).toBe(0);
  await db.query("insert into public.member_roles(member_id,role) values($1,'reviewer')", [ids[2]]);
  await db.query("insert into public.alpha_reviewer_scopes(member_id,category,scope,granted_by) values($1,'Traders','Second independent reviewer',$1)", [ids[2]]);
  await db.query("insert into public.launch_reviewer_scopes(member_id,category,rank,scope,granted_by) values($1,'Traders','Bronze','Second independent reviewer',$1)", [ids[2]]);
  const award = (await db.query<{ id: string }>("select id from public.launch_xp_events where version_id=$1 and kind='work'", [records[0]!.version])).rows[0]!.id;
  await rpc("launch_reverse_work", [ids[2], bindings[2], award,
    "Isolated reviewer found a documented material factual error", JSON.stringify([{ url: "https://ethereum.org/en/" }])]);
  expect(await rpc<number>("launch_ordinary_remaining", [ids[0]])).toBe(0);
  expect(await rpc<number>("launch_available_progress", [ids[0]])).toBe(600);
});

it("counts an existing positive award in the same UTC week against the launch allowance", async () => {
  const { launch: _launch, ...legacyPayload } = payload();
  void _launch;
  const legacy = await rpc<{ version: string }>("alpha_submit_v2", [ids[0], bindings[0], randomUUID(), JSON.stringify(legacyPayload)]);
  const assignment = (await db.query<{ id: string }>("select id from public.review_assignments where version_id=$1 and reviewer_id=$2", [legacy.version, ids[1]])).rows[0]!.id;
  const assessment = Object.fromEntries(["evidence", "relevance", "addition", "limitations", "alternatives"].map((key) => [key, "Independent review of the saved source and its limits"]));
  await rpc("alpha_decide_v2", [ids[1], bindings[1], legacy.version, assignment, "accept",
    "Earlier independent acceptance with a recorded award", "No conflicting interest", true, checklistVersion, JSON.stringify(assessment)]);
  const prior = (await db.query<{ xp: number }>("select xp from public.award_ledger where version_id=$1", [legacy.version])).rows[0]!.xp;
  expect(await rpc<number>("launch_ordinary_remaining", [ids[0]])).toBe(900 - prior);
});

it("limits active enhanced approvals to three without rolling back the fourth work decision", async () => {
  const first = await submit();
  await db.query("insert into public.alpha_reviewer_scopes(member_id,category,scope,granted_by) values($1,'Meta Catchers','Independent meta review scope',$1)", [ids[1]]);
  await db.query("insert into public.launch_reviewer_scopes(member_id,category,rank,scope,granted_by) values($1,'Meta Catchers','Bronze','Independent meta review scope',$1)", [ids[1]]);
  const startsAt = new Date(Math.ceil((Date.now() + 7 * 86400000) / 3600000) * 3600000).toISOString();
  const horizon = new Date(Date.parse(startsAt) + 31 * 86400000).toISOString();
  const prediction = { commitment: "normal", predictionClass: "enhanced", baseline: "40 monthly active users", target: "100 monthly active users", invalidation: "Fewer than 100 monthly active users",
    sourceType: "public_research", startsAt };
  const metaContext = Object.fromEntries(["theme", "projects", "earlyEvidence", "whyNow", "target", "invalidation", "horizon"].map((key) => [key, "Unknown"]));
  const versions: string[] = [];
  for (let i = 0; i < 4; i++) {
    const record = await submit(payload({ type: "update", relatedVersion: first.version, category: "Meta Catchers",
      subject: "Documented public usage pattern", details: Object.fromEntries(categoryFields["Meta Catchers"].map((field) => [field.key, "Unknown"])),
      horizon, checkCondition: "Check the published monthly active user count at the declared horizon",
      claim: `Isolated enhanced observation ${i} with independent source`,
      launch: { ...payload().launch, context: metaContext, prediction } }));
    versions.push(record.version);
    expect((await decide(record.version, "none")).workXp).toBe(0);
  }
  const approved = await db.query<{ version_id: string }>("select version_id from public.launch_enhanced_approvals where version_id=any($1::uuid[])", [versions]);
  expect(approved.rows).toHaveLength(3);
  expect(approved.rows.some((row) => row.version_id === versions[3])).toBe(false);
  expect((await db.query("select id from public.review_decisions where version_id=$1 and decision='accept'", [versions[3]])).rows).toHaveLength(1);
});
