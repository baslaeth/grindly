import "server-only";
import { requireActiveMembership } from "../membership/access";
import { tokenTier } from "../membership/metadata";
import { readOwnership } from "../membership/chain";
import { createDataClient } from "../supabase";
import { ServiceError } from "../errors";
import type { ResearchInput } from "@/research/input";
import type { ResearchData, Snapshot } from "@/research/model";

export type ResearchContext = {
  room?: string;
  finding?: string;
  version?: string;
  message?: string;
  profile?: string;
  sourceRevision?: string;
};
export async function readResearch(
  writableCookies = false,
  context: ResearchContext = {},
): Promise<ResearchData> {
  const active = await requireActiveMembership(writableCookies);
  const db = createDataClient();
  const result = await db.rpc("research_snapshot_v3", {
    p_member: active.member.id,
    p_binding: active.binding.id,
    p_room: context.room,
  });
  if (result.error) {
    if (result.error.message.startsWith("research:"))
      throw new ServiceError(
        "SPACE_UNAVAILABLE",
        "This space or record is not available to your membership.",
        403,
      );
    throw result.error;
  }
  if (!result.data)
    throw new ServiceError(
      "RESEARCH_UNAVAILABLE",
      "Research is temporarily unavailable.",
      503,
      true,
    );
  const snapshot = result.data as unknown as Snapshot;
  const tier = await tokenTier(active.binding.token_id, active.ownership);
  if (snapshot.question?.rank && snapshot.question.rank !== tier)
    throw new ServiceError(
      "RANK_CHANGED",
      "Membership changed. Reload to continue.",
      409,
      true,
    );
  let questionId: string | undefined;
  if (context.finding && context.finding !== "latest") {
    const finding = snapshot.findings.find((f) => f.id === context.finding);
    if (!finding)
      throw new ServiceError("RECORD_UNAVAILABLE", "Record unavailable.", 404);
    questionId = finding.question_id;
  }
  if (context.version) {
    const version = snapshot.versions.find((v) => v.id === context.version);
    const finding = snapshot.findings.find((f) => f.id === version?.finding_id);
    if (!finding)
      throw new ServiceError("RECORD_UNAVAILABLE", "Record unavailable.", 404);
    questionId = finding.question_id;
  }
  if (context.message) {
    const message = snapshot.messages.find((m) => m.id === context.message);
    if (!message)
      throw new ServiceError("RECORD_UNAVAILABLE", "Record unavailable.", 404);
    if (context.sourceRevision && message.revision !== context.sourceRevision)
      throw new ServiceError(
        "RECORD_UNAVAILABLE",
        "The source changed. Open its current version from Hub.",
        409,
      );
    questionId = message.question_id;
  }
  if (questionId && snapshot.rooms) {
    const question = snapshot.rooms.find((q) => q.id === questionId);
    if (!question || (context.room && question.id !== context.room))
      throw new ServiceError("RECORD_UNAVAILABLE", "Record unavailable.", 404);
    snapshot.question = question;
  }
  if (
    context.profile &&
    !snapshot.directory?.some((p) => p.id === context.profile) &&
    !snapshot.demoProfiles?.some((p) => "demo-" + p.id === context.profile)
  )
    throw new ServiceError(
      "PROFILE_UNAVAILABLE",
      "Profile unavailable in this space.",
      404,
    );
  // Directory labels use recorded bindings, not decorative per-profile RPCs.
  const tiers: Record<string, string> = { [active.member.id]: tier };
  for (const member of snapshot.directory ?? []) tiers[member.id] = member.tier;
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
  const result = await createDataClient().rpc("research_mutate_v3", {
    p_binding: active.binding.id,
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
