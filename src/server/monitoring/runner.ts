import "server-only";
import { createDataClient } from "@/server/supabase";
import { primaryDocument, primaryUrl } from "@/server/alpha/sources";
import { reportFailure } from "@/server/diagnostics";

export async function runDueMonitoring() {
  const db = createDataClient();
  const due = await db.from("launch_monitor_sources").select("id,url").eq("enabled", true).lte("next_due", new Date().toISOString()).order("next_due").limit(10);
  if (due.error) throw due.error;
  const results: { id: string; status: string }[] = [];
  for (const source of due.data ?? []) {
    const checked = primaryUrl(source.url) ? await primaryDocument(source.url, `monitor-${source.id}`) : null;
    const status = checked?.status === "retrieved" && checked.digest ? "retrieved" : "source_unavailable";
    const result = await db.rpc("launch_monitor_ingest", {
      p_source: source.id, p_status: status, p_digest: (checked?.digest ?? null) as string,
      p_source_date: (checked?.publishedAt ?? null) as string,
      p_detail: status === "retrieved" ? "Official page retrieved. A changed digest needs operator verification; retrieval alone does not confirm an event." : "Approved source unavailable or unsupported. No event inferred.",
    });
    if (result.error) {
      reportFailure("monitor.ingest", new Error("Monitor observation could not be saved"));
      results.push({ id: source.id, status: "persist_failed" });
    } else results.push({ id: source.id, status: String((result.data as { status?: string })?.status ?? "unknown") });
  }
  const reminders = await db.rpc("launch_due_reminders");
  if (reminders.error) throw reminders.error;
  const digest = await db.rpc("launch_deliver_digest");
  if (digest.error) throw digest.error;
  return { checked: results.length, statuses: results.map((r) => r.status), reminders: reminders.data ?? 0, digest: digest.data ?? 0 };
}
