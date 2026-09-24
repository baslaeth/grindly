import { getEnvironment } from "@/server/environment";
import { requireMember } from "@/server/auth/session";
import { assertSameOrigin, errorResponse, jsonResponse } from "@/server/http";
import { mintMembership } from "@/server/membership/issuance";
export const runtime = "nodejs";
export const maxDuration = 60;
export async function POST(request: Request) {
  try {
    assertSameOrigin(request, getEnvironment().APP_URL);
    const member = await requireMember();
    return jsonResponse(await mintMembership(member.id));
  } catch (error) {
    return errorResponse(error);
  }
}
