import type { Hex } from "viem";
import { getEnvironment } from "@/server/environment";
import {
  assertSameOrigin,
  errorResponse,
  jsonResponse,
  readJson,
} from "@/server/http";
import { proofInput } from "@/server/wallet/proof";
import { bindWallet } from "@/server/wallet/service";

export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    assertSameOrigin(request, getEnvironment().APP_URL);
    const input = await readJson(request, proofInput);
    return jsonResponse(
      await bindWallet(input.challengeId, input.signature as Hex),
    );
  } catch (error) {
    return errorResponse(error);
  }
}
