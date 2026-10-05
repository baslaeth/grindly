import { timingSafeEqual } from "node:crypto";
import { runDueMonitoring } from "@/server/monitoring/runner";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  const expected = process.env.CRON_SECRET;
  const supplied = request.headers.get("authorization")?.replace(/^Bearer /, "") ?? "";
  if (!expected || !supplied || Buffer.byteLength(expected) !== Buffer.byteLength(supplied) || !timingSafeEqual(Buffer.from(expected), Buffer.from(supplied)))
    return Response.json({ error: "Unavailable" }, { status: 401 });
  try {
    const result = await runDueMonitoring();
    return Response.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: "Monitoring unavailable" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
