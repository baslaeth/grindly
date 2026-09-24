import { requireActiveMembership } from "@/server/membership/access";
import { getEnvironment } from "@/server/environment";
import { assertSameOrigin, errorResponse, jsonResponse } from "@/server/http";
import { createDataClient } from "@/server/supabase";
export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    assertSameOrigin(request, getEnvironment().APP_URL);
    const { member, binding } = await requireActiveMembership(true);
    const { error } = await createDataClient().from("audit_events").insert({
      actor_member_id: member.id,
      event_type: "membership.protected_check",
      subject_id: binding.id,
    });
    if (error) throw error;
    return jsonResponse({ active: true });
  } catch (error) {
    return errorResponse(error);
  }
}
