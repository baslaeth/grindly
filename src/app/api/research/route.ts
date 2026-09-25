import { researchInput } from "@/research/input";
import { readResearch, mutateResearch } from "@/server/research/service";
import {
  assertSameOrigin,
  errorResponse,
  jsonResponse,
  readJson,
} from "@/server/http";
import { getEnvironment } from "@/server/environment";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    return jsonResponse(await readResearch(true));
  } catch (error) {
    return errorResponse(error);
  }
}
export async function POST(request: Request) {
  try {
    assertSameOrigin(request, getEnvironment().APP_URL);
    return jsonResponse(
      await mutateResearch(await readJson(request, researchInput, 16384)),
    );
  } catch (error) {
    return errorResponse(error);
  }
}
