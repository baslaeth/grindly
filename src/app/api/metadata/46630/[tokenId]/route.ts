import { z } from "zod";
import { readOwnership } from "@/server/membership/chain";
import { tokenTier } from "@/server/membership/metadata";
import { errorResponse, jsonResponse } from "@/server/http";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(
  _request: Request,
  context: { params: Promise<{ tokenId: string }> },
) {
  try {
    const { tokenId } = await context.params;
    if (
      !z
        .string()
        .regex(/^[1-9][0-9]{0,77}$/)
        .safeParse(tokenId).success ||
      BigInt(tokenId) >= 2n ** 256n
    )
      return jsonResponse({ error: "Invalid token" }, 400);
    const ownership = await readOwnership(BigInt(tokenId));
    const tier = await tokenTier(tokenId, ownership);
    return jsonResponse({
      name: `Grindly Membership #${tokenId}`,
      description:
        "Grindly specialist exchange membership on Robinhood Chain testnet.",
      attributes: [
        { trait_type: "Tier", value: tier },
        { trait_type: "Network", value: "Robinhood Chain testnet" },
      ],
    });
  } catch (error) {
    return errorResponse(error);
  }
}
