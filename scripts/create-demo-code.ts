import { randomBytes } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";
import { parseEnvironment } from "../src/config/environment";
import { hashInvitation } from "../src/server/auth/input";
import type { Database } from "../src/types/database";
const env = parseEnvironment(process.env);
if (!env.SUPABASE_URL || !env.SUPABASE_SECRET_KEY)
  throw new Error("Supabase configuration required");
const code = `GRINDLY-${randomBytes(6).toString("hex").toUpperCase()}`;
const db = createClient<Database>(env.SUPABASE_URL, env.SUPABASE_SECRET_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const result = await db
  .from("demo_codes")
  .insert({ token_hash: hashInvitation(code) })
  .select("id")
  .single();
if (result.error) throw new Error("Demo code creation failed");
await mkdir(".local/invitations", { recursive: true });
await writeFile(
  `.local/invitations/demo-${result.data.id}.txt`,
  `Demo invitation code: ${code}\nURL: https://grindly.io/join?mode=demo\nReusable for multiple verified emails until revoked.\n`,
  { flag: "wx" },
);
console.log(
  `Reusable demo code saved to .local/invitations/demo-${result.data.id}.txt`,
);
