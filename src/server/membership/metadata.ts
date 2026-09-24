import "server-only";
import { createDataClient } from "../supabase";
import { membershipChain, readOwnership } from "./chain";

export async function tokenTier(
  tokenId: string,
  ownership: Awaited<ReturnType<typeof readOwnership>>,
) {
  const { address } = membershipChain();
  const db = createDataClient();
  const binding = await db
    .from("membership_bindings")
    .select("id,member_id,wallet_binding_id")
    .eq("contract_address", address)
    .eq("token_id", tokenId)
    .eq("ownership_epoch", ownership.epoch)
    .is("revoked_at", null)
    .maybeSingle();
  if (binding.error) throw binding.error;
  if (!binding.data) return "Bronze";
  const wallet = await db
    .from("wallet_bindings")
    .select("address")
    .eq("id", binding.data.wallet_binding_id)
    .eq("member_id", binding.data.member_id)
    .is("revoked_at", null)
    .maybeSingle();
  if (wallet.error) throw wallet.error;
  if (wallet.data?.address !== ownership.owner) return "Bronze";
  const promotion = await db
    .from("promotion_decisions")
    .select("approved_by")
    .eq("membership_binding_id", binding.data.id)
    .eq("member_id", binding.data.member_id)
    .eq("contract_address", address)
    .eq("token_id", tokenId)
    .eq("ownership_epoch", ownership.epoch)
    .is("revoked_at", null)
    .maybeSingle();
  if (promotion.error) throw promotion.error;
  if (!promotion.data) return "Bronze";
  const steward = await db
    .from("member_roles")
    .select("member_id")
    .eq("member_id", promotion.data.approved_by)
    .eq("role", "steward")
    .maybeSingle();
  if (steward.error) throw steward.error;
  return steward.data ? "Silver" : "Bronze";
}
