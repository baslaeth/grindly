import { researchInput } from "@/research/input";
import { readResearch, mutateResearch } from "@/server/research/service";
import {
  assertSameOrigin,
  errorResponse,
  jsonResponse,
  readJson,
} from "@/server/http";
import { getEnvironment } from "@/server/environment";
import { reportFailure, withRequestDiagnostics } from "@/server/diagnostics";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  return withRequestDiagnostics(async () => {
    try {
      const query = new URL(request.url).searchParams;
      return jsonResponse(
        await readResearch(true, {
          room: query.get("room") ?? undefined,
          profile: query.get("profile") ?? undefined,
          finding: query.get("finding") ?? undefined,
          version: query.get("version") ?? undefined,
          message: query.get("message") ?? undefined,
        }),
      );
    } catch (error) {
      reportFailure("research.read", error);
      return errorResponse(error);
    }
  });
}
export async function POST(request: Request) {
  return withRequestDiagnostics(async () => {
    try {
      assertSameOrigin(request, getEnvironment().APP_URL);
      return jsonResponse(
        await mutateResearch(await readJson(request, researchInput, 16384)),
      );
    } catch (error) {
      reportFailure("research.mutation", error);
      return errorResponse(error);
    }
  });
}
