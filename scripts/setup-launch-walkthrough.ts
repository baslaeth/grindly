import { readFile, writeFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";
import { categories } from "../src/research/spaces";

// Explicitly opt-in, existing isolated identities only. Never appoint genuine staff.
if (!process.argv.includes("--isolated-authorized"))
  throw new Error("Explicit isolated fixture authorization required");
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
const fixtures = JSON.parse(
  await readFile(".local/research-fixtures.json", "utf8"),
) as { email: string; member: string }[];
const members = ["project", "risk", "operations"].map((name) =>
  fixtures.find((f) => f.email === `grindly-qa-research-${name}@example.test`)!,
);
for (const f of members) {
  if (!f) throw new Error("Existing fixture missing");
  const p = await db
    .from("research_profiles")
    .select("is_demo")
    .eq("member_id", f.member)
    .single();
  if (p.error || p.data?.is_demo !== true)
    throw new Error("Non-demo fixture refused");
}
const operator = members[2]!;
const role = await db
  .from("member_roles")
  .upsert(
    { member_id: operator.member, role: "steward" },
    { onConflict: "member_id,role", ignoreDuplicates: true },
  );
if (role.error) throw new Error("Isolated operator setup failed");
const binding = await db
  .from("membership_bindings")
  .select("id")
  .eq("member_id", operator.member)
  .is("revoked_at", null)
  .single();
if (binding.error) throw new Error("Isolated operator binding absent");
for (const reviewer of members.slice(0, 2))
  for (const category of categories) {
    const result = await db.rpc("launch_set_reviewer", {
      p_actor: operator.member,
      p_binding: binding.data.id,
      p_candidate: reviewer.member,
      p_category: category,
      p_scope: "Isolated launch walkthrough evidence review only",
      p_grant: true,
    });
    if (result.error)
      throw new Error(
        `Isolated scope setup failed: ${category}: ${result.error.code} ${result.error.message}`,
      );
  }
await writeFile(
  ".local/launch-walkthrough-setup.json",
  JSON.stringify({
    at: new Date().toISOString(),
    isolated: true,
    operator: operator.member,
    reviewers: members.slice(0, 2).map((f) => f.member),
  }),
);
console.log(
  "Existing isolated operator and independent reviewer scopes ready. No genuine member roles changed.",
);
