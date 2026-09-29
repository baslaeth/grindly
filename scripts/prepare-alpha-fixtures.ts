import { createClient } from "@supabase/supabase-js";
import { readFile } from "node:fs/promises";
const db = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!,
  { auth: { persistSession: false } },
);
const fixtures = JSON.parse(
  await readFile(".local/research-fixtures.json", "utf8"),
) as { member: string; email: string }[];
if (
  fixtures.length !== 3 ||
  fixtures.some(
    (f) =>
      !/^grindly-qa-research-(project|risk|operations)@example.test$/.test(
        f.email,
      ),
  )
)
  throw new Error("Existing isolated identities required");
let count = 0;
for (const f of fixtures) {
  const p = await db
    .from("research_profiles")
    .select("is_demo")
    .eq("member_id", f.member)
    .single();
  const m = await db
    .from("members")
    .select("email")
    .eq("id", f.member)
    .single();
  const r = await db
    .from("member_roles")
    .select("role")
    .eq("member_id", f.member)
    .eq("role", "reviewer");
  if (
    p.error ||
    m.error ||
    r.error ||
    !p.data.is_demo ||
    m.data.email !== f.email
  )
    throw new Error("Fixture boundary not confirmed");
  if (!r.data.length) continue;
  for (const category of ["Traders", "Project Analysts"]) {
    const prior = await db
      .from("alpha_reviewer_scopes")
      .select("member_id")
      .eq("member_id", f.member)
      .eq("category", category)
      .maybeSingle();
    if (prior.error) throw new Error("Migration required");
    if (prior.data) continue;
    const added = await db
      .from("alpha_reviewer_scopes")
      .insert({
        member_id: f.member,
        category,
        scope:
          "Isolated demonstration evidence assessment only; no genuine member authority",
        granted_by: f.member,
      });
    if (added.error) throw new Error("Fixture scope unavailable");
    const audit = await db
      .from("audit_events")
      .insert({
        actor_member_id: f.member,
        event_type: "alpha.qa_scope_authorized",
        subject_id: f.member,
        details: {
          category,
          authority:
            "2026-09-29 owner-authorized isolated reviewer verification",
        },
      });
    if (audit.error) throw new Error("Fixture audit unavailable");
    count++;
  }
}
console.log(
  `Prepared ${count} isolated category scopes on existing demo reviewers. No production reviewer roles changed.`,
);
