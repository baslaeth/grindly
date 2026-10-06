import { createClient } from "@supabase/supabase-js";
import { writeFile, readFile } from "node:fs/promises";
process.loadEnvFile(".env.local");
const role = process.argv[2];
if (!["project", "risk", "operations"].includes(role ?? ""))
  throw Error("Existing isolated identity only");
if (
  new URL(process.env.SUPABASE_URL!).hostname !==
  "errbtterppmvtlfltgzp.supabase.co"
)
  throw Error("Unexpected project");
const db = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!,
  { auth: { persistSession: false } },
);
const email = `grindly-qa-research-${role}@example.test`;
const f = (
  JSON.parse(await readFile(".local/research-fixtures.json", "utf8")) as {
    member: string;
    email: string;
  }[]
).find((f) => f.email === email);
if (!f) throw Error("Existing fixture absent");
const profile = await db
  .from("research_profiles")
  .select("is_demo")
  .eq("member_id", f.member)
  .single();
if (profile.data?.is_demo !== true) throw Error("Not isolated");
const result = await db.auth.admin.generateLink({ type: "magiclink", email });
if (result.error) throw Error("Isolated code unavailable");
await writeFile(
  ".local/airdrop-browser-code.txt",
  result.data.properties.email_otp,
);
console.log("Isolated code written to ignored local file; no session copied.");
