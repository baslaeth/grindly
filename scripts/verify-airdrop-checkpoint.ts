import { createClient } from "@supabase/supabase-js";
import { readFile, writeFile } from "node:fs/promises";
process.loadEnvFile(".env.local");
if (
  new URL(process.env.SUPABASE_URL!).hostname !==
  "errbtterppmvtlfltgzp.supabase.co"
)
  throw Error("Wrong review project");
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
if (profile.data?.is_demo !== true) throw Error("Isolated author required");
const ids = [
  "5ca03988-fea2-443f-9c63-1e538315fa64",
  "71732d68-bd5b-4b5b-b1d4-52f1cb1c8996",
  "52ca4d81-5e3f-4e35-bf77-2c2f3fef055f",
];
const findings = await db
  .from("findings")
  .select("id,current_version,status")
  .in("id", ids)
  .eq("author_id", member);
if (findings.error || findings.data.length !== 3)
  throw Error("Expected isolated records unavailable");
const versions = findings.data.map((f) => f.current_version);
const awards = await db
  .from("launch_xp_events")
  .select("version_id,kind,xp")
  .in("version_id", versions);
const campaigns = await db
  .from("airdrop_campaigns")
  .select("id,url,last_status,last_success_at,next_due");
const replay = JSON.parse(
  await readFile("docs/airdrop-evidence/monitoring-replay.json", "utf8"),
);
const event = await db
  .from("airdrop_events")
  .select(
    "status,is_demo,announced_at,scheduled_at,observed_available_at,confirmed_at",
  )
  .eq("id", replay.event)
  .single();
const notifications = await db
  .from("airdrop_notifications")
  .select("member_id,status,acknowledged_at,done_at")
  .eq("event_id", replay.event);
if (awards.error || campaigns.error || event.error || notifications.error)
  throw Error("Checkpoint read failed");
if (!event.data.is_demo) throw Error("Replay is not isolated");
let genuineRecipients = 0;
for (const notification of notifications.data) {
  const recipient = await db
    .from("research_profiles")
    .select("is_demo")
    .eq("member_id", notification.member_id)
    .single();
  if (recipient.error) throw Error("Recipient isolation could not be verified");
  if (!recipient.data.is_demo) genuineRecipients++;
}
if (genuineRecipients !== 0) throw Error("Replay reached a genuine recipient");
const scheduler = JSON.parse(
  await readFile(".local/monitor-scheduler.json", "utf8"),
);
await writeFile(
  "docs/airdrop-evidence/shared-checkpoint.json",
  JSON.stringify(
    {
      checkedAt: new Date().toISOString(),
      classification:
        "Read-only verification of isolated browser-created records; not genuine member activity",
      findings: findings.data,
      awards: awards.data,
      campaigns: campaigns.data,
      replay: event.data,
      notifications: notifications.data.map(
        ({ status, acknowledged_at, done_at }) => ({
          status,
          acknowledged_at,
          done_at,
        }),
      ),
      genuineRecipients,
      scheduler: {
        lastRunAt: scheduler.lastRunAt,
        lastExitCode: scheduler.lastExitCode,
        intervalMinutes: scheduler.intervalMinutes,
      },
    },
    null,
    2,
  ),
);
console.log(
  "Isolated records, award, campaign checks and notification state verified; no private data exported.",
);
