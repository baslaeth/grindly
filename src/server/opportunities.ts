import "server-only";
import { createDataClient } from "./supabase";
import { getEnvironment } from "./environment";
import { privateResult } from "./chat/service";
import { requireResearchMembership as requireActiveMembership } from "./membership/research-access";
import type { z } from "zod";
import type { Opportunity, opportunityInput } from "@/opportunities/model";
export async function publicOpportunities(sample: boolean) {
  if (getEnvironment().GRINDLY_STAGE === "foundation") return [];
  return privateResult(
    await createDataClient().rpc("opportunity_list", { p_sample: sample }),
  ) as unknown as Opportunity[];
}
export async function actOnOpportunity(
  input: z.infer<typeof opportunityInput>,
) {
  const active = await requireActiveMembership(true);
  if (input.action === "manage")
    return privateResult(
      await createDataClient().rpc("opportunity_manage", {
        p_member: active.member.id,
        p_binding: active.binding.id,
        p_action: input.operation,
        p_data: "data" in input ? input.data : {},
      }),
    );
  return privateResult(
    await createDataClient().rpc("opportunity_action", {
      p_member: active.member.id,
      p_binding: active.binding.id,
      p_id: input.id,
      p_action: input.action,
    }),
  );
}
