import { mkdir, writeFile } from "node:fs/promises";
process.loadEnvFile(".env.local");
if (
  new URL(process.env.SUPABASE_URL!).hostname !==
  "errbtterppmvtlfltgzp.supabase.co"
)
  throw new Error("Unexpected monitor project");
const { runDueMonitoring } = await import("../src/server/monitoring/runner");
const result = await runDueMonitoring();
await mkdir(".local", { recursive: true });
await writeFile(
  ".local/monitor-last-run.json",
  JSON.stringify(
    {
      at: new Date().toISOString(),
      scheduler: process.argv.includes("--scheduled")
        ? "local-scheduler"
        : "manual",
      ...result,
    },
    null,
    2,
  ),
);
console.log(JSON.stringify(result));
