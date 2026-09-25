// Explicit, operator-only testnet setup. Never imported by the application.
import { createClient } from "@supabase/supabase-js";
import { request } from "@playwright/test";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { createPublicClient, http } from "viem";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { setTimeout } from "node:timers/promises";
import type { Database } from "../src/types/database";

if (!process.argv.includes("--apply-testnet-fixtures"))
  throw new Error(
    "Requires --apply-testnet-fixtures; creates labeled isolated QA identities and real testnet memberships.",
  );
const base = process.env.RESEARCH_TEST_URL ?? "http://localhost:3000";
if (
  !["http://localhost:3000", "https://grindly-woad.vercel.app"].includes(base)
)
  throw new Error("Unexpected test destination");
const chain = createPublicClient({
  transport: http(process.env.ROBINHOOD_RPC_URL),
});
if ((await chain.getChainId()) !== 46630)
  throw new Error("Robinhood testnet only");
const db = createClient<Database>(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!,
  { auth: { persistSession: false } },
);
const file = new URL("../.local/research-fixtures.json", import.meta.url);
type Fixture = {
  email: string;
  member: string;
  key: `0x${string}`;
  name: string;
  specialty: "project" | "risk" | "operations";
  token?: string;
};
let fixtures: Fixture[] = [];
try {
  fixtures = JSON.parse(await readFile(file, "utf8"));
} catch {
  /* First explicit setup. */
}
await mkdir(new URL("../.local/", import.meta.url), { recursive: true });
const save = () =>
  writeFile(file, JSON.stringify(fixtures, null, 2), { mode: 0o600 });
for (const [index, specialty] of (
  ["project", "risk", "operations"] as const
).entries()) {
  let f = fixtures[index];
  if (!f) {
    const email = `grindly-qa-research-${specialty}@example.test`;
    const existing = await db
      .from("members")
      .select("id")
      .eq("email", email)
      .maybeSingle();
    if (existing.data)
      throw new Error(
        "Fixture exists without local journal; do not overwrite it.",
      );
    const user = await db.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: { demo: true, purpose: "isolated research QA" },
    });
    if (user.error) throw user.error;
    const member = await db
      .from("members")
      .insert({ auth_user_id: user.data.user.id, email })
      .select("id")
      .single();
    if (member.error) throw member.error;
    f = {
      email,
      member: member.data.id,
      key: generatePrivateKey(),
      name: `DEMO QA ${specialty}`,
      specialty,
    };
    fixtures.push(f);
    await save();
    const audit = await db.from("audit_events").insert({
      actor_member_id: f.member,
      event_type: "qa.research_fixture_created",
      subject_id: f.member,
      details: {
        demo: true,
        purpose:
          "Isolated identity for collaboration verification; not a real user",
      },
    });
    if (audit.error) throw audit.error;
  }
  const api = await request.newContext({
    baseURL: base,
    extraHTTPHeaders: { Origin: base },
  });
  try {
    const intent = await api.post("/api/auth/otp", {
      data: { mode: "returning", email: f.email },
    });
    if (!intent.ok()) throw new Error(`OTP intent failed ${intent.status()}`);
    let signedIn = false;
    for (let retry = 0; retry < 3; retry++) {
      await setTimeout(1500);
      const otp = await db.auth.admin.generateLink({
        type: "magiclink",
        email: f.email,
      });
      if (otp.error) throw otp.error;
      const verified = await api.post("/api/auth/verify", {
        data: { code: otp.data.properties.email_otp },
      });
      if (verified.ok()) {
        signedIn = true;
        break;
      }
    }
    if (!signedIn) throw new Error("Fixture OTP verification failed");
    const wallet = await db
      .from("wallet_bindings")
      .select("id")
      .eq("member_id", f.member)
      .is("revoked_at", null)
      .maybeSingle();
    if (wallet.error) throw wallet.error;
    if (!wallet.data) {
      const account = privateKeyToAccount(f.key);
      const challenge = await api.post("/api/wallet/challenge", {
        data: { address: account.address, chainId: 46630 },
      });
      if (!challenge.ok())
        throw new Error(`Challenge failed ${challenge.status()}`);
      const proof = await challenge.json();
      const signature = await account.signMessage({ message: proof.message });
      const verified = await api.post("/api/wallet/verify", {
        data: { challengeId: proof.challengeId, signature },
      });
      if (!verified.ok()) throw new Error(`Proof failed ${verified.status()}`);
    }
    let bound = false;
    for (let attempt = 0; attempt < 12; attempt++) {
      const response = await api.post("/api/membership/mint", { data: {} });
      const result = await response.json();
      if (!response.ok()) throw new Error(`Mint failed: ${result.error?.code}`);
      if (result.status === "confirmed") {
        f.token = result.tokenId;
        await save();
        bound = true;
        break;
      }
      await setTimeout(1500);
    }
    if (!bound) throw new Error("Mint remains pending; rerun to reconcile");
    const profile = await api.post("/api/research", {
      data: { action: "profile", name: f.name, specialty: f.specialty },
    });
    if (!profile.ok()) throw new Error(`Profile failed ${profile.status()}`);
    const label = await db
      .from("research_profiles")
      .update({ is_demo: true })
      .eq("member_id", f.member);
    if (label.error) throw label.error;
    console.log(
      `${f.name}: signed in, wallet proved, real testnet membership confirmed.`,
    );
  } finally {
    await api.dispose();
  }
}
// Isolated reviewers are authorized ONLY for labeled fixtures (enforced in migration 008).
for (const f of fixtures) {
  const role = await db.from("member_roles").upsert(
    {
      member_id: f.member,
      role: "reviewer",
      granted_by: fixtures[0]!.member,
    },
    { onConflict: "member_id,role" },
  );
  if (role.error) throw role.error;
  for (const specialty of ["project", "risk", "operations"]) {
    const scope = await db.from("research_reviewer_scopes").upsert(
      {
        member_id: f.member,
        specialty,
        scope:
          "DEMO QA ONLY: assess labeled synthetic research fixtures, not real member work.",
        granted_by: fixtures[0]!.member,
      },
      { onConflict: "member_id,specialty" },
    );
    if (scope.error) throw scope.error;
  }
}
console.log(
  "Fixture journal is ignored. Existing real member identities and sessions were not changed.",
);
for (const f of fixtures) {
  const existing = await db
    .from("audit_events")
    .select("id")
    .eq("event_type", "qa.research_reviewer_granted")
    .eq("subject_id", f.member);
  if (existing.error) throw existing.error;
  if (!existing.data.length) {
    const audit = await db.from("audit_events").insert({
      event_type: "qa.research_reviewer_granted",
      subject_id: f.member,
      details: {
        demo: true,
        scope: "Synthetic QA work only; cannot review genuine members",
      },
    });
    if (audit.error) throw audit.error;
  }
}
