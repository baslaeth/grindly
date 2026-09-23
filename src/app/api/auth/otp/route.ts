import { otpRequest } from "@/server/auth/input";
import { requestOtp } from "@/server/auth/service";
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
    await requestOtp(await readJson(request, otpRequest));
    return jsonResponse({
      message: "If this email is eligible, a code is on its way.",
    });
  } catch (error) {
    return errorResponse(error);
  }
}
