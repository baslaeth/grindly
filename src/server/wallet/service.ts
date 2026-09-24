import "server-only";
import type { Hex } from "viem";
import { requireMember } from "../auth/session";
import { createDataClient } from "../supabase";
import { getEnvironment } from "../environment";
import { ServiceError } from "../errors";
import { createChallenge, verifyChallenge } from "./proof";

async function proofTime(db: ReturnType<typeof createDataClient>) {
  const { data, error } = await db.rpc("wallet_proof_clock");
  const time = typeof data === "string" ? new Date(data) : null;
  if (error || !time || !Number.isFinite(time.getTime()))
    throw new ServiceError(
      "WALLET_CLOCK_UNAVAILABLE",
      "Wallet verification is temporarily unavailable. Please retry.",
      503,
      true,
    );
  return time;
}

export async function issueChallenge(address: string) {
  const member = await requireMember(true);
  const db = createDataClient();
  const challenge = createChallenge(
    member.id,
    address,
    getEnvironment().APP_URL,
    await proofTime(db),
  );
  const { error } = await db.rpc("issue_wallet_challenge", {
    p_id: challenge.id,
    p_member_id: member.id,
    p_address: challenge.address,
    p_nonce: challenge.nonce,
    p_domain: challenge.domain,
    p_uri: challenge.uri,
    p_message: challenge.message,
    p_created_at: challenge.created_at,
    p_expires_at: challenge.expires_at,
  });
  if (error) {
    if (error.message.includes("Challenge rate limit"))
      throw new ServiceError(
        "RATE_LIMITED",
        "Please wait a minute before retrying.",
        429,
        true,
      );
    throw error;
  }
  return { challengeId: challenge.id, message: challenge.message };
}

export async function bindWallet(challengeId: string, signature: Hex) {
  const member = await requireMember(true);
  const db = createDataClient();
  const { data: challenge, error } = await db
    .from("wallet_challenges")
    .select("*")
    .eq("id", challengeId)
    .eq("member_id", member.id)
    .maybeSingle();
  if (error) throw error;
  if (!challenge)
    throw new ServiceError(
      "INVALID_WALLET_PROOF",
      "Request a new wallet challenge.",
      403,
    );
  await verifyChallenge(
    challenge,
    member.id,
    signature,
    getEnvironment().APP_URL,
    await proofTime(db),
  );
  const { error: bindError } = await db.rpc("bind_verified_wallet", {
    p_member_id: member.id,
    p_challenge_id: challenge.id,
    p_message: challenge.message,
  });
  if (bindError) {
    if (
      bindError.code === "23505" ||
      bindError.message.includes("Wallet already bound")
    )
      throw new ServiceError(
        "WALLET_BOUND",
        "This wallet or member already has a binding.",
        409,
      );
    if (bindError.message.includes("Challenge unavailable"))
      throw new ServiceError(
        "INVALID_WALLET_PROOF",
        "Request a new wallet challenge.",
        403,
      );
    throw bindError;
  }
  return { address: challenge.address };
}
