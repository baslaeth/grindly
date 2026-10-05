import { spawn } from "node:child_process";
import { mkdir, open, readFile, unlink, writeFile } from "node:fs/promises";
import { setTimeout } from "node:timers/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
process.chdir(root);
await mkdir(".local", { recursive: true });
// An exclusive lifetime lock prevents two local schedulers from duplicating runs.
try {
  const previous = Number(
    await readFile(".local/monitor-scheduler.lock", "utf8"),
  );
  if (!Number.isInteger(previous) || previous <= 0)
    throw new Error("Invalid scheduler lock; inspect it before restarting");
  try {
    process.kill(previous, 0);
    throw new Error("A local scheduler is already running");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ESRCH") throw error;
    await unlink(".local/monitor-scheduler.lock");
  }
} catch (error) {
  if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
}
const lock = await open(".local/monitor-scheduler.lock", "wx");
await lock.writeFile(String(process.pid));
const state = {
  pid: process.pid,
  intervalMinutes: 15,
  scope: "local review environment",
  startedAt: new Date().toISOString(),
};
await writeFile(
  ".local/monitor-scheduler.json",
  JSON.stringify(state, null, 2),
);
await setTimeout(60000);
for (;;) {
  const result = await new Promise<number | null>((done) => {
    const child = spawn(
      process.execPath,
      [
        "--use-system-ca",
        "--conditions=react-server",
        "--import",
        "tsx",
        "scripts/run-local-monitor.ts",
        "--scheduled",
      ],
      { cwd: root, windowsHide: true, stdio: "ignore" },
    );
    child.on("error", () => done(-1));
    child.on("exit", done);
  });
  await writeFile(
    ".local/monitor-scheduler.json",
    JSON.stringify(
      {
        ...state,
        lastRunAt: new Date().toISOString(),
        lastExitCode: result,
        nextRunAt: new Date(Date.now() + 15 * 60000).toISOString(),
      },
      null,
      2,
    ),
  );
  await setTimeout(15 * 60000);
}
