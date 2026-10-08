import "server-only";
import { createDataClient } from "../supabase";
import { ServiceError } from "../errors";
import { requireResearchMembership as requireActiveMembership } from "../membership/research-access";
import type { chatInput, ChatSnapshot } from "@/chat/model";
import type { z } from "zod";

export function privateResult<T>(result: {
  data: T;
  error: { message: string } | null;
}): NonNullable<T> {
  if (result.error) {
    if (result.error.message.startsWith("research:"))
      throw new ServiceError(
        "ACTION_UNAVAILABLE",
        "This action or content is unavailable. Check your access and try again.",
        403,
      );
    throw result.error;
  }
  if (result.data === null)
    throw new ServiceError(
      "SERVICE_UNAVAILABLE",
      "Service temporarily unavailable. Please retry.",
      503,
      true,
    );
  return result.data!;
}
export async function readChat(room: string, before?: number, after?: number) {
  const active = await requireActiveMembership(true);
  return privateResult(
    await createDataClient().rpc("chat_snapshot", {
      p_member: active.member.id,
      p_binding: active.binding.id,
      p_room: room,
      p_before: before,
      p_after: after,
    }),
  ) as unknown as ChatSnapshot;
}
export async function writeChat(input: z.infer<typeof chatInput>) {
  const active = await requireActiveMembership(true);
  const { action, ...data } = input.mutation;
  return privateResult(
    await createDataClient().rpc("chat_mutate", {
      p_member: active.member.id,
      p_binding: active.binding.id,
      p_room: input.room,
      p_request: input.request,
      p_action: action,
      p_data: data,
    }),
  );
}
