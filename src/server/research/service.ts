import "server-only";
import { requireActiveMembership } from "../membership/access";
import { tokenTier } from "../membership/metadata";
import { readOwnership } from "../membership/chain";
import { createDataClient } from "../supabase";
import { ServiceError } from "../errors";
import type { ResearchInput } from "@/research/input";
import type { ResearchData, Snapshot } from "@/research/model";

export async function readResearch(
  writableCookies = false,
): Promise<ResearchData> {
  const active = await requireActiveMembership(writableCookies);
  const db = createDataClient();
  const result = await db.rpc("research_snapshot", {
    p_member: active.member.id,
  });
  if (result.error) throw result.error;
  if (!result.data)
    throw new ServiceError(
      "RESEARCH_UNAVAILABLE",
      "Research is temporarily unavailable.",
      503,
      true,
    );
  const snapshot = result.data as unknown as Snapshot;
  const tier = await tokenTier(active.binding.token_id, active.ownership);
  const tiers: Record<string, string> = { [active.member.id]: tier };
  // Display tiers are fresh ownership-derived facts, never a profile/specialty flag.
  const ids = snapshot.profiles
    .map((p) => p.member_id)
    .filter((id) => id !== active.member.id);
  if (ids.length) {
    const bindings = await db
      .from("membership_bindings")
      .select("member_id,token_id,wallet_binding_id,ownership_epoch")
      .in("member_id", ids)
      .eq("contract_address", active.binding.contract_address)
      .is("revoked_at", null);
    if (bindings.error) throw bindings.error;
    for (const id of ids) tiers[id] = "No active membership";
    await Promise.all(
      bindings.data.map(async (binding) => {
        try {
          const ownership = await readOwnership(
            BigInt(binding.token_id),
            BigInt(active.ownership.block),
          );
          const wallet = await db
            .from("wallet_bindings")
            .select("address")
            .eq("id", binding.wallet_binding_id)
            .is("revoked_at", null)
            .maybeSingle();
          if (wallet.error) throw wallet.error;
          if (
            ownership.epoch === binding.ownership_epoch &&
            ownership.owner === wallet.data?.address
          )
            tiers[binding.member_id] = await tokenTier(
              binding.token_id,
              ownership,
            );
        } catch {
          tiers[binding.member_id] = "Tier check unavailable";
        }
      }),
    );
  }
  const mint = await db
    .from("chain_operations")
    .select("transaction_hash")
    .eq("contract_address", active.binding.contract_address)
    .eq("token_id", active.binding.token_id)
    .eq("status", "confirmed")
    .maybeSingle();
  if (mint.error) throw mint.error;
  return {
    ...snapshot,
    memberId: active.member.id,
    tiers,
    token: {
      id: active.binding.token_id,
      contract: active.binding.contract_address,
      tier,
      mint: mint.data?.transaction_hash ?? null,
    },
  };
}

export async function mutateResearch(input: ResearchInput) {
  const active = await requireActiveMembership(true);
  if (
    input.action === "peerRequest" &&
    (await tokenTier(active.binding.token_id, active.ownership)) !== "Silver"
  )
    throw new ServiceError(
      "SILVER_REQUIRED",
      "A current, steward-approved Silver membership is required.",
      403,
    );
  const { action, ...data } = input;
  if (action === "promote" && input.action === "promote") {
    const db = createDataClient();
    const role = await db
      .from("member_roles")
      .select("member_id")
      .eq("member_id", active.member.id)
      .eq("role", "steward")
      .maybeSingle();
    if (role.error) throw role.error;
    if (!role.data || input.member === active.member.id)
      throw new ServiceError(
        "STEWARD_REQUIRED",
        "An independent steward is required.",
        403,
      );
    const target = await db
      .from("membership_bindings")
      .select("*")
      .eq("member_id", input.member)
      .eq("contract_address", active.binding.contract_address)
      .is("revoked_at", null)
      .maybeSingle();
    if (target.error) throw target.error;
    if (!target.data)
      throw new ServiceError(
        "NO_ACTIVE_TOKEN",
        "The candidate must bind a current token.",
        409,
      );
    const wallet = await db
      .from("wallet_bindings")
      .select("address")
      .eq("id", target.data.wallet_binding_id)
      .is("revoked_at", null)
      .maybeSingle();
    if (wallet.error) throw wallet.error;
    const ownership = await readOwnership(BigInt(target.data.token_id));
    if (
      ownership.epoch !== target.data.ownership_epoch ||
      ownership.owner !== wallet.data?.address
    )
      throw new ServiceError(
        "STALE_CANDIDATE",
        "The candidate must bind a current token.",
        409,
      );
    Object.assign(data, { binding: target.data.id });
  }
  const result = await createDataClient().rpc("research_mutate", {
    p_member: active.member.id,
    p_action: action,
    p_data: data,
  });
  if (result.error) {
    if (result.error.message.startsWith("research:"))
      throw new ServiceError(
        "RESEARCH_CONFLICT",
        result.error.message.slice(10).trim(),
        409,
      );
    throw result.error;
  }
  return result.data;
}
