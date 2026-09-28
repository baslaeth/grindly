import "server-only";
import { createDataClient } from "../supabase";
import { membershipChain, type readOwnership } from "./chain";

export async function tokenTier(
  tokenId: string,
  ownership: Awaited<ReturnType<typeof readOwnership>>,
) {
  // Callers still prove token existence/current ownership on-chain. Tier itself
  // is the NFT's recorded progression, independent of owner and transfer epoch.
  void ownership;
  const { address } = membershipChain();
  const { data, error } = await createDataClient()
    .from("nft_tier_events")
    .select("tier")
    .eq("chain_id", 46630)
    .eq("contract_address", address)
    .eq("token_id", tokenId)
    .maybeSingle();
  if (error) throw error;
  return data?.tier === "Silver" ? "Silver" : "Bronze";
}
