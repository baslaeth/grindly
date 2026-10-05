import { readFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";
if (!process.argv.includes("--isolated-authorized"))
  throw new Error("Isolated authorization required");
process.loadEnvFile(".env.local");
if (
  new URL(process.env.SUPABASE_URL!).hostname !==
  "errbtterppmvtlfltgzp.supabase.co"
)
  throw new Error("Unexpected project");
const db = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!,
  { auth: { persistSession: false } },
);
const setup = JSON.parse(
  await readFile(".local/launch-walkthrough-setup.json", "utf8"),
);
const marker = JSON.parse(
  await readFile(".local/analysis-walkthrough.json", "utf8"),
);
const profile = await db
  .from("research_profiles")
  .select("is_demo")
  .eq("member_id", setup.operator)
  .single();
const alpha = await db
  .from("alpha_versions")
  .select("version_id")
  .eq("version_id", marker.version)
  .single();
if (!profile.data?.is_demo || alpha.error)
  throw new Error("Existing isolated fixture required");
const finding = await db
  .from("finding_versions")
  .select("finding_id")
  .eq("id", marker.version)
  .single();
const binding = await db
  .from("membership_bindings")
  .select("id")
  .eq("member_id", setup.operator)
  .is("revoked_at", null)
  .single();
if (!finding.data || !binding.data)
  throw new Error("Fixture target unavailable");
const result = await db.rpc("launch_set_alpha_monitor_source", {
  p_actor: setup.operator,
  p_binding: binding.data.id,
  p_finding: finding.data.finding_id,
  p_url:
    "https://docs.cdp.coinbase.com/api-reference/exchange-api/rest-api/products/get-product-candles",
  p_cadence: 24,
  p_enabled: true,
});
if (result.error)
  throw new Error(`Isolated monitoring setup failed: ${result.error.message}`);
console.log(
  "Isolated alpha official-document monitoring configured; next check due. No genuine records changed.",
);
