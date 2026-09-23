import "server-only";
import { cookies } from "next/headers";
import type { z } from "zod";
import {
  createAuthClient,
  createDataClient,
  getAuthEnvironment,
} from "@/server/supabase";
import { ServiceError } from "@/server/errors";
import { hashInvitation, intentSchema, type otpRequest } from "./input";

const intentCookie = "grindly-otp-intent";

export async function readOtpIntent() {
  const value = (await cookies()).get(intentCookie)?.value;
  if (!value) return null;
  try {
    const parsed = intentSchema.safeParse(JSON.parse(value));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export async function requestOtp(input: z.infer<typeof otpRequest>) {
  const env = getAuthEnvironment();
  const db = createDataClient();
  const invitationHash =
    input.mode === "join" ? hashInvitation(input.invitation) : undefined;
  let eligible = true;
  if (invitationHash) {
    const result = await db.rpc("reserve_invitation_otp", {
      p_token_hash: invitationHash,
      p_email: input.email,
      p_cooldown_seconds: env.OTP_COOLDOWN_SECONDS,
      p_max_requests: env.INVITATION_MAX_OTP_REQUESTS,
    });
    if (result.error)
      throw new ServiceError(
        "DATABASE_UNAVAILABLE",
        "Sign-in is temporarily unavailable.",
        503,
        true,
      );
    if (!result.data)
      throw new ServiceError(
        "INVITATION_UNAVAILABLE",
        "Invitation unavailable. Check the email and code, or wait before retrying.",
        400,
      );
  } else {
    const result = await db
      .from("members")
      .select("id")
      .eq("email", input.email)
      .maybeSingle();
    if (result.error)
      throw new ServiceError(
        "DATABASE_UNAVAILABLE",
        "Sign-in is temporarily unavailable.",
        503,
        true,
      );
    eligible = Boolean(result.data);
  }

  if (eligible) {
    const auth = await createAuthClient();
    const { error } = await auth.auth.signInWithOtp({
      email: input.email,
      options: { shouldCreateUser: input.mode === "join" },
    });
    if (error)
      throw new ServiceError(
        "OTP_UNAVAILABLE",
        "Unable to send a code right now. Please retry shortly.",
        error.status === 429 ? 429 : 503,
        true,
      );
  }

  (await cookies()).set(
    intentCookie,
    JSON.stringify({ email: input.email, invitationHash }),
    {
      httpOnly: true,
      secure: new URL(env.APP_URL).protocol === "https:",
      sameSite: "strict",
      path: "/",
      maxAge: 600,
    },
  );
}

export async function verifyOtp(code: string) {
  getAuthEnvironment();
  const intent = await readOtpIntent();
  if (!intent)
    throw new ServiceError("OTP_EXPIRED", "Request a new sign-in code.");
  const auth = await createAuthClient();
  const { data, error } = await auth.auth.verifyOtp({
    email: intent.email,
    token: code,
    type: "email",
  });
  if (error && (!error.status || error.status >= 500 || error.status === 429))
    throw new ServiceError(
      "AUTH_UNAVAILABLE",
      "Unable to verify the code right now. Please retry.",
      error.status === 429 ? 429 : 503,
      true,
    );
  if (error || !data.user)
    throw new ServiceError("INVALID_OTP", "Code is invalid or expired.");

  try {
    const verified = await auth.auth.getUser();
    const user = verified.data.user;
    if (
      verified.error &&
      (!verified.error.status || verified.error.status >= 500)
    )
      throw new ServiceError(
        "AUTH_UNAVAILABLE",
        "Account verification is temporarily unavailable.",
        503,
        true,
      );
    if (
      verified.error ||
      !user?.email_confirmed_at ||
      user.email?.trim().toLowerCase() !== intent.email
    ) {
      throw new ServiceError(
        "AUTH_REQUIRED",
        "Unable to verify this account.",
        401,
      );
    }
    const db = createDataClient();
    if (intent.invitationHash) {
      const redemption = await db.rpc("redeem_invitation", {
        p_token_hash: intent.invitationHash,
        p_auth_user_id: user.id,
      });
      if (redemption.error) {
        if (redemption.error.code === "P0001")
          throw new ServiceError(
            "INVITATION_UNAVAILABLE",
            "Invitation is no longer available.",
            403,
          );
        throw new ServiceError(
          "DATABASE_UNAVAILABLE",
          "Unable to finish joining. Please retry.",
          503,
          true,
        );
      }
    } else {
      const membership = await db
        .from("members")
        .select("id")
        .eq("auth_user_id", user.id)
        .maybeSingle();
      if (membership.error)
        throw new ServiceError(
          "DATABASE_UNAVAILABLE",
          "Account temporarily unavailable.",
          503,
          true,
        );
      if (!membership.data)
        throw new ServiceError(
          "INVITATION_REQUIRED",
          "This account needs an invitation.",
          403,
        );
    }
  } catch (error) {
    await auth.auth.signOut({ scope: "local" });
    throw error;
  }
  (await cookies()).delete(intentCookie);
}

export async function signOut() {
  const auth = await createAuthClient();
  const { error } = await auth.auth.signOut({ scope: "local" });
  if (error)
    throw new ServiceError(
      "AUTH_UNAVAILABLE",
      "Unable to sign out. Please retry.",
      503,
      true,
    );
  (await cookies()).delete(intentCookie);
}
