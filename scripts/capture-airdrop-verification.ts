import { createClient } from "@supabase/supabase-js";
import { readFile, writeFile } from "node:fs/promises";
process.loadEnvFile(".env.local");
if (
  new URL(process.env.SUPABASE_URL!).hostname !==
  "errbtterppmvtlfltgzp.supabase.co"
)
  throw Error("Wrong project");
const db = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!,
  { auth: { persistSession: false } },
);
const version = "c35a2a9c-6f36-4883-bfd9-c861941f02e7";
const author = await db
  .from("findings")
  .select("author_id")
  .eq("id", "d78f8829-b062-4e1f-9c95-220281b31ece")
  .single();
if (author.error) throw Error("Isolated guide required");
const profile = await db
  .from("research_profiles")
  .select("is_demo")
  .eq("member_id", author.data.author_id)
  .single();
if (!profile.data?.is_demo) throw Error("Isolated author required");
const runs = await db
  .from("alpha_preliminary_runs")
  .select("status,created_at,completed_at,model,error_code,card,sources")
  .eq("version_id", version)
  .order("created_at");
const campaigns = await db
  .from("airdrop_campaigns")
  .select("id,url,last_status,last_success_at,next_due")
  .eq("id", "axis-points-epochs");
if (runs.error || campaigns.error) throw Error("Verification unavailable");
const awards = await db
  .from("launch_xp_events")
  .select("version_id,kind,xp,ordinary,reviewer_id,created_at")
  .eq("version_id", version);
if (
  awards.error ||
  awards.data.length !== 1 ||
  awards.data[0]!.xp !== 50 ||
  awards.data[0]!.reviewer_id === author.data.author_id
)
  throw Error("Expected exactly one independent isolated award");
const notifications = await db
  .from("airdrop_notifications")
  .select("status,event_id,created_at,acknowledged_at,done_at")
  .eq("member_id", author.data.author_id);
if (notifications.error) throw Error("Notification evidence unavailable");
await writeFile(
  "docs/airdrop-reliability-evidence/browser-model-results.json",
  JSON.stringify(
    {
      classification:
        "Isolated Codex-authored guide saved and model triggered in browser; no genuine member data",
      version,
      runs: runs.data,
      awards: awards.data.map(({ reviewer_id, ...award }) => ({
        ...award,
        independent: reviewer_id !== author.data.author_id,
      })),
      notifications: notifications.data,
      campaigns: campaigns.data,
      scheduler: JSON.parse(
        await readFile(".local/monitor-scheduler.json", "utf8"),
      ),
    },
    null,
    2,
  ),
);
console.log(
  JSON.stringify({
    runs: runs.data.map((r) => ({
      status: r.status,
      claims: (r.card as { claims?: unknown[] })?.claims?.length,
    })),
    campaigns: campaigns.data,
  }),
);
