import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
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
const marker = JSON.parse(
  await readFile(".local/analysis-walkthrough.json", "utf8"),
);
const finding = await db
  .from("finding_versions")
  .select("finding_id")
  .eq("id", marker.version)
  .single();
if (!finding.data) throw new Error("Existing walkthrough required");
const author = await db
  .from("findings")
  .select("author_id")
  .eq("id", finding.data.finding_id)
  .single();
if (!author.data) throw new Error("Existing author required");
const profile = await db
  .from("research_profiles")
  .select("is_demo")
  .eq("member_id", author.data.author_id)
  .single();
if (!profile.data?.is_demo) throw new Error("Genuine records are forbidden");
const source = await db
  .from("launch_monitor_sources")
  .select("id,last_success_at,last_digest")
  .eq("finding_id", finding.data.finding_id)
  .single();
if (!source.data?.last_success_at)
  throw new Error("Real source check required first");
const digest = createHash("sha256")
  .update(
    "Controlled launch walkthrough event v1; no real Coinbase document change",
  )
  .digest("hex");
const previous = await db
  .from("launch_monitor_events")
  .select("id")
  .eq("source_id", source.data.id)
  .eq("digest", digest)
  .maybeSingle();
let event = previous.data?.id;
if (!event) {
  const due = await db
    .from("launch_monitor_sources")
    .update({ next_due: new Date(Date.now() - 60000).toISOString() })
    .eq("id", source.data.id);
  if (due.error) throw new Error("Could not schedule isolated observation");
  const result = await db.rpc("launch_monitor_ingest", {
    p_source: source.data.id,
    p_status: "retrieved",
    p_digest: digest,
    p_source_date: null,
    p_detail:
      "Controlled walkthrough: synthetic change for operator/notification testing. The official Coinbase page has not been shown to change.",
  });
  if (result.error)
    throw new Error(`Controlled event failed: ${result.error.message}`);
  event = (result.data as { event?: string }).event;
  // Keep the actual source baseline; the controlled event remains explicitly labeled.
  const restored = await db
    .from("launch_monitor_sources")
    .update({ last_digest: source.data.last_digest })
    .eq("id", source.data.id);
  if (restored.error)
    throw new Error("Could not restore actual observation baseline");
}
if (!event) throw new Error("Controlled event not persisted");
await writeFile(
  ".local/controlled-monitor-event.json",
  JSON.stringify({ event, isolated: true }, null, 2),
);
console.log(
  "Controlled event persisted for the isolated alpha only; requires independent operator confirmation.",
);
