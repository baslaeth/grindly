import "server-only";
import { createAuthClient, createDataClient } from "@/server/supabase";
import { ServiceError } from "@/server/errors";

export async function getCurrentMember() {
  const auth = await createAuthClient(true);
  const { data, error } = await auth.auth.getUser();
  if (error) {
    if (
      error.name === "AuthSessionMissingError" ||
      [400, 401, 403].includes(error.status ?? 0)
    )
      return null;
    throw new ServiceError(
      "AUTH_UNAVAILABLE",
      "Sign-in is temporarily unavailable.",
      503,
      true,
    );
  }
  if (!data.user?.email_confirmed_at) return null;
  const result = await createDataClient()
    .from("members")
    .select("id, email, auth_user_id")
    .eq("auth_user_id", data.user.id)
    .maybeSingle();
  if (result.error)
    throw new ServiceError(
      "DATABASE_UNAVAILABLE",
      "Account temporarily unavailable.",
      503,
      true,
    );
  return result.data;
}

export async function requireMember() {
  const member = await getCurrentMember();
  if (!member)
    throw new ServiceError(
      "AUTH_REQUIRED",
      "Sign in with an invited account.",
      401,
    );
  return member;
}
