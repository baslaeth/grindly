import { otpVerification } from "@/server/auth/input";
import { verifyOtp } from "@/server/auth/service";
import { getEnvironment } from "@/server/environment";
import {
  assertSameOrigin,
  errorResponse,
  jsonResponse,
  readJson,
} from "@/server/http";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request, getEnvironment().APP_URL);
    await verifyOtp((await readJson(request, otpVerification)).code);
    return jsonResponse({ authenticated: true });
  } catch (error) {
    return errorResponse(error);
  }
}
