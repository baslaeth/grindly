import { z } from "zod";
import { requireMember } from "@/server/auth/session";
import { getEnvironment } from "@/server/environment";
import {
  assertSameOrigin,
  errorResponse,
  jsonResponse,
  readJson,
} from "@/server/http";
import { bindOwnedToken } from "@/server/membership/access";
export const runtime = "nodejs";
const input = z.strictObject({
  tokenId: z
    .string()
    .regex(/^[1-9][0-9]{0,77}$/)
    .refine((value) => BigInt(value) < 2n ** 256n),
});
export async function POST(request: Request) {
  try {
    assertSameOrigin(request, getEnvironment().APP_URL);
    const member = await requireMember(true);
    const { tokenId } = await readJson(request, input);
    return jsonResponse(await bindOwnedToken(member.id, tokenId));
  } catch (error) {
    return errorResponse(error);
  }
}
