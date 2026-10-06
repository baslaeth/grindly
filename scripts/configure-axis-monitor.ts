import { createClient } from "@supabase/supabase-js";
import { primaryDocument } from "../src/server/alpha/sources";
process.loadEnvFile(".env.local");
if (
  new URL(process.env.SUPABASE_URL!).hostname !==
  "errbtterppmvtlfltgzp.supabase.co"
)
  throw Error("Wrong project");
const url = "https://docs.axisrobotics.ai/contributor-guide/points";
const source = await primaryDocument(
  url,
  "axis",
  "points signed eligibility guarantees epochs",
);
if (
  source.status !== "retrieved" ||
  !source.facts.includes("The Point System is live") ||
  !source.facts.includes("guarantees no eligibility")
)
  throw Error("Current official program evidence unavailable");
const db = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!,
  { auth: { persistSession: false } },
);
const result = await db
  .from("airdrop_campaigns")
  .upsert(
    {
      id: "axis-points-epochs",
      project: "Axis",
      name: "Axis Points: ongoing epochs (not tokens)",
      url,
    },
    { onConflict: "id", ignoreDuplicates: true },
  );
if (result.error) throw Error(result.error.code);
console.log(
  "Verified official Axis Points source registered. Scheduler must establish first successful check; no wallet activity or token claim asserted.",
);
