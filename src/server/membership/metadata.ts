import "server-only";
import { createDataClient } from "../supabase";
import { membershipChain, type readOwnership } from "./chain";
import { ranks, type Rank } from "@/research/spaces";

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
  if (!data) return "Bronze";
  if (!ranks.includes(data.tier as Rank))
    throw new Error("Unrecognized recorded NFT tier");
  return data.tier as Rank;
}
