import { getEnvironment } from "@/server/environment";
import {
  assertSameOrigin,
  errorResponse,
  jsonResponse,
  readJson,
} from "@/server/http";
import { challengeInput } from "@/server/wallet/proof";
import { issueChallenge } from "@/server/wallet/service";

export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    assertSameOrigin(request, getEnvironment().APP_URL);
    const input = await readJson(request, challengeInput);
    return jsonResponse(await issueChallenge(input.address));
  } catch (error) {
    return errorResponse(error);
  }
}
