import { afterAll, afterEach, beforeAll, beforeEach, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { createTestDatabase } from "./database";
import { categories } from "../../src/research/spaces";
import { launchFields, legacyDetails } from "../../src/launch/forms";
import { launchPolicy } from "../../src/launch/policy";
import { alphaSubmission } from "../../src/alpha/model";
import { checklistVersion } from "../../src/alpha/checklists";
import { airdropGuideVersion } from "../../src/alpha/airdrop";

let db: Awaited<ReturnType<typeof createTestDatabase>>;
type Category = (typeof categories)[number];
let member: string;
let binding: string;
beforeAll(async () => {
  db = await createTestDatabase();
});
afterAll(async () => {
  await db.close();
});
beforeEach(async () => {
  await db.exec("begin");
  member = randomUUID();
  await db.query(
    "insert into auth.users(id,email,email_confirmed_at) values($1,$2,now())",
    [member, `${member}@example.test`],
  );
  await db.query(
    "insert into public.members(id,auth_user_id,email) values($1,$1,$2)",
    [member, `${member}@example.test`],
  );
  await db.query(
    "insert into public.research_profiles(member_id,display_name,specialty,is_demo) values($1,'Category save fixture','project',true)",
    [member],
  );
  await db.query(
    "insert into public.wallet_challenges(id,member_id,address,nonce,domain,uri,message,expires_at) values($1,$1,$2,$3,'localhost','http://localhost','proof',now()+interval '5 minutes')",
    [member, `0x${"1".repeat(40)}`, member],
  );
  await db.query("select public.bind_verified_wallet($1,$1,'proof')", [member]);
  binding = (
    await db.query<{ v: string }>(
      "select public.bind_owned_token($1,$2,$3,$4,$5,$6) v",
      [member, `0x${"c".repeat(40)}`, "1", "1", "10", `0x${"e".repeat(64)}`],
    )
  ).rows[0]!.v;
  await db.exec("set role service_role");
});
afterEach(async () => {
  await db.exec("rollback; reset role");
});

function sample(category: Category) {
  const context = Object.fromEntries(
    launchFields[category].map((field) => [field.key, "Unknown"]),
  );
  for (const field of launchFields[category]) {
    if (field.fromPrediction) continue;
    context[field.key] =
      field.kind === "date"
        ? "2027-01-01T12:00:00Z"
        : field.kind === "url"
          ? "https://docs.cdp.coinbase.com/exchange/introduction"
          : (field.options?.[0] ??
            `Recorded ${field.label.toLowerCase()} with dated official evidence`);
  }
  if (category === "Project Analysts")
    context.checkpoint =
      "Watch whether documented API limits change, then repeat the integration check";
  return {
    action: "submit",
    request: randomUUID(),
    finding: null,
    previous: null,
    category,
    type: "guide",
    visibility: "members",
    claim: `Fictional ${category} guide with a checkable source`,
    purpose: "A member can check this source before acting",
    addition: "I compared the dated source with the stated action",
    limitations: "Isolated fixture; eligibility remains Unknown",
    subject: `Fictional ${category}`,
    chain: ["Airdrop Hunters", "Degens", "NFT Specialists"].includes(category)
      ? "Unknown"
      : "",
    contract: ["Degens", "NFT Specialists"].includes(category) ? "Unknown" : "",
    details: legacyDetails(category, context),
    evidence: [
      {
        kind: "link",
        value: "https://example.test/official",
        label: "Isolated source",
      },
    ],
    launch: {
      policyVersion: launchPolicy.version,
      opportunity: `Fictional ${category} opportunity`,
      usefulAction: "Check the official requirements before acting",
      costOrRisk: "Costs and eligibility are Unknown",
      context,
      prediction: null,
    },
    checklist: checklistVersion,
    firstNoticed: null,
    horizon: null,
    checkCondition: "",
    sourceMessage: null,
    sourceRevision: null,
    relatedVersion: null,
    correction: null,
  };
}

it.each(categories)(
  "saves %s through validation, launch RPC and same-rank snapshot",
  async (category) => {
    const input = alphaSubmission.parse(sample(category));
    const saved = (
      await db.query<{ v: { id: string; version: string } }>(
        "select public.launch_submit($1,$2,$3,$4::jsonb) v",
        [member, binding, input.request, JSON.stringify(input)],
      )
    ).rows[0]!.v;
    const room = (
      await db.query<{ id: string }>(
        "select id from public.research_questions where rank='Bronze' and category=$1",
        [category],
      )
    ).rows[0]!.id;
    const snapshot = (
      await db.query<{
        v: {
          alphas: { version_id: string }[];
          launchTerms: {
            version_id: string;
            context: Record<string, string>;
          }[];
        };
      }>("select public.alpha_snapshot($1,$2,$3) v", [member, binding, room])
    ).rows[0]!.v;
    expect(snapshot.alphas.some((a) => a.version_id === saved.version)).toBe(
      true,
    );
    expect(
      snapshot.launchTerms.find((t) => t.version_id === saved.version)?.context,
    ).toEqual(input.launch!.context);
    expect(
      (await db.query("select id from public.findings where id=$1", [saved.id]))
        .rows,
    ).toHaveLength(1);
  },
);

it.each(categories)(
  "a demo visitor can save %s without any NFT binding",
  async (category) => {
    const code = randomUUID(),
      access = randomUUID();
    await db.query(
      "insert into public.demo_codes(id,token_hash) values($1,$2)",
      [code, "d".repeat(64)],
    );
    await db.query(
      "insert into public.demo_access(id,member_id,code_id) values($1,$2,$3)",
      [access, member, code],
    );
    await db.query(
      "update public.membership_bindings set revoked_at=now() where member_id=$1",
      [member],
    );
    const input = alphaSubmission.parse(sample(category));
    const saved = (
      await db.query<{ v: { id: string; version: string } }>(
        "select public.launch_submit($1,$2,$3,$4::jsonb) v",
        [member, access, input.request, JSON.stringify(input)],
      )
    ).rows[0]!.v;
    expect(
      (
        await db.query<{ status: string }>(
          "select status from public.findings where id=$1",
          [saved.id],
        )
      ).rows[0]!.status,
    ).toBe("pending");
    expect(
      (
        await db.query("select * from public.award_ledger where member_id=$1", [
          member,
        ])
      ).rows,
    ).toHaveLength(0);
    const snapshot = (
      await db.query<{ v: { alphas: { version_id: string }[] } }>(
        "select public.alpha_snapshot($1,$2,null) v",
        [member, access],
      )
    ).rows[0]!.v;
    expect(snapshot.alphas.some((a) => a.version_id === saved.version)).toBe(
      true,
    );
  },
);

it("rejects omitted or malformed category context on both validation boundaries", async () => {
  const missing = sample("Traders");
  delete (missing.launch.context as Record<string, string>).asset;
  expect(alphaSubmission.safeParse(missing).success).toBe(false);
  await db.exec("savepoint missing");
  await expect(
    db.query("select public.launch_submit($1,$2,$3,$4::jsonb)", [
      member,
      binding,
      missing.request,
      JSON.stringify(missing),
    ]),
  ).rejects.toThrow(/research: missing launch category context/);
  await db.exec("rollback to savepoint missing");
  const malformed = sample("Whitelist Hunters");
  malformed.launch.context.official = "http://not-official.example.test";
  await db.exec("savepoint malformed");
  await expect(
    db.query("select public.launch_submit($1,$2,$3,$4::jsonb)", [
      member,
      binding,
      malformed.request,
      JSON.stringify(malformed),
    ]),
  ).rejects.toThrow(/research: official HTTPS source required/);
  await db.exec("rollback to savepoint malformed");
});

it("preserves structured airdrop fields on versions and idempotent retries", async () => {
  const input = alphaSubmission.parse({
    ...sample("Airdrop Hunters"),
    airdrop: {
      version: airdropGuideVersion,
      stage: "Closed or historical",
      official: "https://www.starknet.io/blog/starknet-provisions-program/",
      confirmed: "Historical claiming window closed in 2024",
      speculative: "Unknown",
      steps: "Read the official requirements before acting",
      prerequisites: "Starknet wallet",
      testEvidence: "Unknown",
      exclusions: "Sybil activity excluded",
    },
  });
  const args = [member, binding, input.request, JSON.stringify(input)];
  const first = (
    await db.query<{ v: { id: string; version: string } }>(
      "select public.launch_submit($1,$2,$3,$4::jsonb) v",
      args,
    )
  ).rows[0]!.v;
  const retry = (
    await db.query<{ v: { id: string; version: string } }>(
      "select public.launch_submit($1,$2,$3,$4::jsonb) v",
      args,
    )
  ).rows[0]!.v;
  expect(retry).toMatchObject({ id: first.id, version: first.version });
  const saved = await db.query<{ details: unknown }>(
    "select details from public.airdrop_guides where version_id=$1",
    [first.version],
  );
  expect(saved.rows).toEqual([{ details: input.airdrop }]);
  await db.exec("savepoint changed");
  await expect(
    db.query("select public.launch_submit($1,$2,$3,$4::jsonb)", [
      member,
      binding,
      input.request,
      JSON.stringify({
        ...input,
        airdrop: { ...input.airdrop, steps: "Changed after save" },
      }),
    ]),
  ).rejects.toThrow(/request conflict/);
  await db.exec("rollback to savepoint changed");
  await db.exec("savepoint invalid");
  await expect(
    db.query("select public.launch_submit($1,$2,$3,$4::jsonb)", [
      member,
      binding,
      randomUUID(),
      JSON.stringify({
        ...input,
        airdrop: { ...input.airdrop, confirmed: undefined },
      }),
    ]),
  ).rejects.toThrow(/airdrop/);
  await db.exec("rollback to savepoint invalid");
});
