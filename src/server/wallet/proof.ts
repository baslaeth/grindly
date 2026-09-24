import { randomBytes, randomUUID } from "node:crypto";
import { getAddress, verifyMessage, type Hex } from "viem";
import { createSiweMessage } from "viem/siwe";
import { z } from "zod";
import { ServiceError } from "../errors";

export const challengeInput = z.strictObject({
  address: z.string().regex(/^0x[0-9a-fA-F]{40}$/),
  chainId: z.literal(46630),
});
export const proofInput = z.strictObject({
  challengeId: z.uuid(),
  signature: z.string().regex(/^0x[0-9a-fA-F]{130}$/),
});

type Challenge = {
  id: string;
  member_id: string;
  address: string;
  nonce: string;
  domain: string;
  uri: string;
  chain_id: number;
  message: string;
  created_at: string;
  expires_at: string;
  consumed_at: string | null;
};

function messageFor(challenge: Omit<Challenge, "message" | "consumed_at">) {
  return createSiweMessage({
    address: getAddress(challenge.address),
    chainId: challenge.chain_id,
    domain: challenge.domain,
    uri: challenge.uri,
    version: "1",
    nonce: challenge.nonce,
    requestId: challenge.id,
    statement:
      "Verify wallet ownership for your Grindly membership. This does not authorize a transaction.",
    issuedAt: new Date(challenge.created_at),
    expirationTime: new Date(challenge.expires_at),
  });
}

export function createChallenge(
  memberId: string,
  address: string,
  appUrl: string,
  now = new Date(),
): Challenge {
  const origin = new URL(appUrl);
  const fields = {
    id: randomUUID(),
    member_id: memberId,
    address: getAddress(address).toLowerCase(),
    nonce: randomBytes(32).toString("hex"),
    domain: origin.host,
    uri: new URL("/join", origin).href,
    chain_id: 46630,
    created_at: now.toISOString(),
    expires_at: new Date(now.getTime() + 300_000).toISOString(),
  };
  return { ...fields, message: messageFor(fields), consumed_at: null };
}

export async function verifyChallenge(
  challenge: Challenge,
  memberId: string,
  signature: Hex,
  appUrl: string,
  now = new Date(),
) {
  const origin = new URL(appUrl);
  const issued = Date.parse(challenge.created_at);
  const expires = Date.parse(challenge.expires_at);
  let valid = false;
  try {
    valid =
      challenge.member_id === memberId &&
      challenge.consumed_at === null &&
      challenge.chain_id === 46630 &&
      challenge.domain === origin.host &&
      challenge.uri === new URL("/join", origin).href &&
      Number.isFinite(issued) &&
      Number.isFinite(expires) &&
      issued <= now.getTime() &&
      expires > now.getTime() &&
      expires - issued <= 300_000 &&
      challenge.message === messageFor(challenge) &&
      (await verifyMessage({
        address: getAddress(challenge.address),
        message: challenge.message,
        signature,
      }));
  } catch {
    /* Malformed signatures and messages fail closed. */
  }
  if (!valid)
    throw new ServiceError(
      "INVALID_WALLET_PROOF",
      "Wallet proof is invalid or expired. Request a new challenge.",
      403,
    );
}
