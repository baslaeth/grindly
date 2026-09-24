import "server-only";
import { requireMember } from "../auth/session";
import { createDataClient } from "../supabase";
import { ServiceError } from "../errors";
import { membershipChain, readOwnership } from "./chain";

export async function requireActiveMembership() {
  const member = await requireMember();
  const { address } = membershipChain();
  const db = createDataClient();
  const binding = await db
    .from("membership_bindings")
    .select("*")
    .eq("member_id", member.id)
    .eq("contract_address", address)
    .is("revoked_at", null)
    .maybeSingle();
  if (binding.error) throw binding.error;
  if (!binding.data)
    throw new ServiceError(
      "MEMBERSHIP_REQUIRED",
      "Active membership required.",
      403,
    );
  const wallet = await db
    .from("wallet_bindings")
    .select("address")
    .eq("id", binding.data.wallet_binding_id)
    .eq("member_id", member.id)
    .is("revoked_at", null)
    .maybeSingle();
  if (wallet.error) throw wallet.error;
  if (!wallet.data)
    throw new ServiceError(
      "MEMBERSHIP_REQUIRED",
      "Active membership required.",
      403,
    );
  const ownership = await readOwnership(BigInt(binding.data.token_id));
  if (
    ownership.owner !== wallet.data.address ||
    ownership.epoch !== binding.data.ownership_epoch
  )
    throw new ServiceError(
      "MEMBERSHIP_REQUIRED",
      "Active membership required. Bind your currently owned token again.",
      403,
    );
  return { member, binding: binding.data, ownership };
}

export async function bindOwnedToken(
  memberId: string,
  token: string,
  mintId?: string,
) {
  const { address } = membershipChain();
  const db = createDataClient();
  const wallet = await db
    .from("wallet_bindings")
    .select("address")
    .eq("member_id", memberId)
    .is("revoked_at", null)
    .maybeSingle();
  if (wallet.error) throw wallet.error;
  if (!wallet.data)
    throw new ServiceError("WALLET_REQUIRED", "Verify a wallet first.", 403);
  const owned = await readOwnership(BigInt(token));
  if (owned.owner !== wallet.data.address)
    throw new ServiceError(
      "NOT_TOKEN_OWNER",
      "Your verified wallet does not own this token.",
      403,
    );
  const result = await db.rpc("bind_owned_token", {
    p_member: memberId,
    p_contract: address,
    p_token: token,
    p_epoch: owned.epoch,
    p_block: owned.block,
    p_hash: owned.blockHash,
    p_mint: mintId,
  });
  if (result.error) throw result.error;
  return { tokenId: token, epoch: owned.epoch };
}
