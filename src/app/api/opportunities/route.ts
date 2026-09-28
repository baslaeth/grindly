import { opportunityInput } from "@/opportunities/model";
import { actOnOpportunity, publicOpportunities } from "@/server/opportunities";
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
      return jsonResponse(
        await publicOpportunities(
          new URL(request.url).searchParams.get("sample") === "1",
        ),
      );
    } catch (e) {
      reportFailure("opportunities.public", e);
      return errorResponse(e);
    }
  });
}
export async function POST(request: Request) {
  return withRequestDiagnostics(async () => {
    try {
      assertSameOrigin(request, getEnvironment().APP_URL);
      return jsonResponse(
        await actOnOpportunity(
          await readJson(request, opportunityInput, 16384),
        ),
      );
    } catch (e) {
      reportFailure("opportunities.action", e);
      return errorResponse(e);
    }
  });
}
