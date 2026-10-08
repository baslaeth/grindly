import "server-only";
import { requireMember } from "../auth/session";
import { createDataClient } from "../supabase";
import { ServiceError } from "../errors";
import { requireActiveMembership } from "./access";

export async function demoAccess(memberId: string) {
  const db = createDataClient();
  const result = await db
    .from("demo_access")
    .select("id,revoked_at")
    .eq("member_id", memberId)
    .maybeSingle();
  if (result.error) throw result.error;
  if (!result.data) return null;
  const allowed = await db.rpc("has_demo_access", {
    p_member: memberId,
    p_access: result.data.id,
  });
  if (allowed.error) throw allowed.error;
  if (!allowed.data)
    throw new ServiceError(
      "DEMO_UNAVAILABLE",
      "Demo access is no longer available.",
      403,
    );
  return result.data;
}

export async function requireResearchMembership(writableCookies = false) {
  const member = await requireMember(writableCookies);
  const demo = await demoAccess(member.id);
  if (demo)
    return {
      member,
      demo: true as const,
      // The research RPC's access argument accepts this grant ID. No wallet,
      // on-chain ownership or membership-binding record is fabricated.
      binding: { id: demo.id, token_id: "", contract_address: "" },
      ownership: null,
    };
  return {
    ...(await requireActiveMembership(writableCookies)),
    demo: false as const,
  };
}
