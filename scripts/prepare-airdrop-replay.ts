import { createClient } from "@supabase/supabase-js";
import { createHash } from "node:crypto";
import { writeFile, readFile } from "node:fs/promises";
process.loadEnvFile(".env.local");
if (
  new URL(process.env.SUPABASE_URL!).hostname !==
  "errbtterppmvtlfltgzp.supabase.co"
)
  throw Error("Wrong fixture project");
const db = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!,
  { auth: { persistSession: false } },
);
const fixtures = JSON.parse(
  await readFile(".local/research-fixtures.json", "utf8"),
) as { member: string; email: string }[];
const member = fixtures.find(
  (f) => f.email === "grindly-qa-research-project@example.test",
)?.member;
const profile = await db
  .from("research_profiles")
  .select("is_demo")
  .eq("member_id", member)
  .single();
if (profile.data?.is_demo !== true)
  throw Error("Existing isolated author required");
const campaign = await db
  .from("airdrop_campaigns")
  .select("*")
  .eq("id", "starknet-provisions-2024")
  .single();
if (campaign.error || !campaign.data.last_success_at)
  throw Error("Real scheduled source snapshot required");
const facts = campaign.data.snapshot as { passages: { text: string }[] };
const passage = facts.passages.find(
  (p) =>
    p.text.includes("12pm (UTC) on February 20th, 2024") &&
    p.text.length < 1200,
)?.text;
if (!passage) throw Error("Official opening passage absent");
const result = await db
  .from("airdrop_events")
  .upsert(
    {
      campaign_id: campaign.data.id,
      fingerprint: createHash("sha256")
        .update("controlled-historical-replay-v1:" + passage)
        .digest("hex"),
      kind: "claim_open",
      passage,
      source_url: campaign.data.url,
      source_date: "2024-02-14T07:48:22Z",
      announced_at: "2024-02-14T07:48:22Z",
      scheduled_at: "2024-02-20T12:00:00Z",
      observed_available_at: null,
      is_demo: true,
      required_action:
        "Sample replay only: inspect the historical opening announcement. The 2024 campaign is closed; do not submit a claim.",
    },
    { onConflict: "campaign_id,fingerprint,is_demo", ignoreDuplicates: true },
  )
  .select("id");
if (result.error) throw Error("Could not prepare isolated replay");
await writeFile(
  "docs/airdrop-evidence/monitoring-replay.json",
  JSON.stringify(
    {
      classification:
        "Controlled historical replay, not a live 2026 announcement or claim availability",
      source: campaign.data.url,
      liveRetrievedAt: campaign.data.last_success_at,
      scheduledHistoricalOpening: "2024-02-20T12:00:00Z",
      observedAvailability: null,
      preparedAt: new Date().toISOString(),
      event: result.data?.[0]?.id ?? "already prepared",
      genuineNotifications: 0,
    },
    null,
    2,
  ),
);
console.log(
  "Prepared isolated historical replay for operator confirmation; no member notified yet.",
);
