import { signOut } from "@/server/auth/service";
import { getEnvironment } from "@/server/environment";
import { assertSameOrigin, errorResponse, jsonResponse } from "@/server/http";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request, getEnvironment().APP_URL);
    await signOut();
    return jsonResponse({ authenticated: false });
  } catch (error) {
    return errorResponse(error);
  }
}
