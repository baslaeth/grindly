import { writeFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";
import { modelReview } from "../src/server/alpha/provider";
import { collectSources } from "../src/server/alpha/sources";
import type { ReviewContext } from "../src/alpha/checks";
process.loadEnvFile(".env.local");
if (
  new URL(process.env.SUPABASE_URL!).hostname !==
  "errbtterppmvtlfltgzp.supabase.co"
)
  throw Error("Unexpected project");
const version = process.argv[2];
if (!version || !/^[-a-f0-9]{36}$/.test(version))
  throw Error("Explicit isolated version required");
const db = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!,
  { auth: { persistSession: false } },
);
const v = await db
  .from("finding_versions")
  .select("*")
  .eq("id", version)
  .single();
const f = await db
  .from("findings")
  .select("author_id")
  .eq("id", v.data?.finding_id)
  .single();
const profile = await db
  .from("research_profiles")
  .select("is_demo")
  .eq("member_id", f.data?.author_id)
  .single();
if (profile.data?.is_demo !== true)
  throw Error("Refusing genuine content debug capture");
const a = await db
  .from("alpha_versions")
  .select("*")
  .eq("version_id", version)
  .single();
const t = await db
  .from("launch_submission_terms")
  .select("context")
  .eq("version_id", version)
  .single();
const g = await db
  .from("airdrop_guides")
  .select("details")
  .eq("version_id", version)
  .single();
const context = {
  existing: false,
  run: "isolated-probe",
  isDemo: true,
  alpha: a.data,
  version: v.data,
  launchContext: t.data?.context,
  airdropGuide: g.data?.details,
  candidates: [],
  messages: [],
  reviewedAt: new Date().toISOString(),
} as ReviewContext;
const original = globalThis.fetch;
globalThis.fetch = async (input, init) => {
  const r = await original(input, init);
  if (String(input) === "http://127.0.0.1:11434/api/chat")
    await writeFile(".local/airdrop-model-debug.json", await r.clone().text());
  return r;
};
const result = await modelReview(context, await collectSources(context.alpha), {
  model: "qwen3:4b",
});
await writeFile(
  ".local/airdrop-model-probe.json",
  JSON.stringify(result, null, 2),
);
console.log(
  JSON.stringify({
    claims: result.card.claims.map((c) => ({
      claim: c.claim,
      status: c.status,
    })),
  }),
);
