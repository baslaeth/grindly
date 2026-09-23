import { randomBytes } from "node:crypto";
import { parseArgs } from "node:util";
import { mkdir, writeFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";
import { parseEnvironment } from "../src/config/environment";
import { hashInvitation, normalizedEmail } from "../src/server/auth/input";
import type { Database } from "../src/types/database";

const { values } = parseArgs({
  options: {
    email: { type: "string" },
    days: { type: "string", default: "7" },
  },
});
const email = normalizedEmail.parse(values.email);
const days = Number(values.days);
if (!Number.isInteger(days) || days < 1 || days > 30)
  throw new Error("--days must be between 1 and 30.");
const env = parseEnvironment(process.env);
if (!env.SUPABASE_URL || !env.SUPABASE_SECRET_KEY)
  throw new Error(
    "Configure Supabase in .env.local before creating an invitation.",
  );
const db = createClient<Database>(env.SUPABASE_URL, env.SUPABASE_SECRET_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const token = randomBytes(32).toString("hex");
const expiresAt = new Date(Date.now() + days * 86_400_000).toISOString();
const result = await db
  .from("invitations")
  .insert({ email, token_hash: hashInvitation(token), expires_at: expiresAt })
  .select("id")
  .single();
if (result.error)
  throw new Error(
    "Invitation creation failed. Check service credentials and applied migrations.",
  );
const directory = new URL("../.local/invitations/", import.meta.url);
await mkdir(directory, { recursive: true });
const file = new URL(`${result.data.id}.txt`, directory);
await writeFile(
  file,
  `Email: ${email}\nInvitation code: ${token}\nJoin: ${new URL("/join", env.APP_URL).toString()}\nExpires: ${expiresAt}\n`,
  { flag: "wx", mode: 0o600 },
);
console.log(
  `Invitation created. Private delivery details are in .local/invitations/${result.data.id}.txt`,
);
