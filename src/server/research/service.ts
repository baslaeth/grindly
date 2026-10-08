import "server-only";
import { requireResearchMembership as requireActiveMembership } from "../membership/research-access";
import { tokenTier } from "../membership/metadata";
import { readOwnership } from "../membership/chain";
import { createDataClient } from "../supabase";
import { ServiceError } from "../errors";
import type { ResearchInput } from "@/research/input";
import type { ResearchData, Snapshot } from "@/research/model";
import { localModelConfiguration } from "../alpha/local-model";

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
  const args = {
    p_member: active.member.id,
    p_binding: active.binding.id,
    p_room: context.room,
  };
  let result = await db.rpc("alpha_snapshot", args);
  const alphaSchemaAvailable = result.error?.code !== "PGRST202";
  // Rolling schema compatibility only. Authorization failures never fall back.
  if (!alphaSchemaAvailable)
    result = await db.rpc("research_snapshot_v3", args);
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
  const tier = active.demo
    ? "Bronze"
    : await tokenTier(active.binding.token_id, active.ownership);
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
  const mint = active.demo
    ? { data: null, error: null }
    : await db
        .from("chain_operations")
        .select("transaction_hash")
        .eq("contract_address", active.binding.contract_address)
        .eq("token_id", active.binding.token_id)
        .eq("status", "confirmed")
        .maybeSingle();
  if (mint.error) throw mint.error;
  let localAIEnabled = false;
  try {
    localModelConfiguration(
      snapshot.profiles.find((p) => p.member_id === active.member.id)
        ?.is_demo === true,
    );
    localAIEnabled = !active.demo;
  } catch {
    /* Optional local inference stays disconnected. */
  }
  return {
    ...snapshot,
    evaluationAvailable: snapshot.evaluationAvailable === true,
    alphaSchemaAvailable,
    localAIEnabled,
    memberId: active.member.id,
    memberEmail: active.member.email,
    monitoringSchedule:
      process.env.MONITORING_SCHEDULE === "hosted-daily"
        ? "hosted-daily"
        : "local",
    tiers,
    token: {
      demo: active.demo,
      id: active.binding.token_id,
      contract: active.binding.contract_address,
      tier,
      mint: mint.data?.transaction_hash ?? null,
    },
  };
}

export async function mutateResearch(input: ResearchInput) {
  const active = await requireActiveMembership(true);
  if (input.action === "submit") {
    const db = createDataClient();
    const room = await db
      .from("research_questions")
      .select("category")
      .eq("id", input.room ?? "")
      .maybeSingle();
    if (room.error) throw room.error;
    const launch = await db
      .from("launch_policy_versions")
      .select("version")
      .eq("version", "2026-10-05.1")
      .maybeSingle();
    if (launch.error && launch.error.code !== "PGRST205") throw launch.error;
    if (launch.data || room.data?.category !== "General")
      throw new ServiceError(
        "USE_ALPHA_SUBMISSION",
        "Use Submit Alpha for category contributions.",
        409,
      );
  }
  if (
    input.action === "peerRequest" &&
    (active.demo ||
      (await tokenTier(active.binding.token_id, active.ownership)) !== "Silver")
  )
    throw new ServiceError(
      "SILVER_REQUIRED",
      "A current, steward-approved Silver membership is required.",
      403,
    );
  const { action, ...data } = input;
  if (action === "promote" && input.action === "promote") {
    const db = createDataClient();
    const launch = await db
      .from("launch_policy_versions")
      .select("version")
      .eq("version", "2026-10-05.1")
      .maybeSingle();
    if (launch.error && launch.error.code !== "PGRST205") throw launch.error;
    if (launch.data)
      throw new ServiceError(
        "UPGRADE_INACTIVE",
        "NFT upgrade execution is inactive until burn terms and the transaction are configured.",
        409,
      );
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
