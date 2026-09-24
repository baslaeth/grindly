import { describe, expect, it } from "vitest";
import { privateKeyToAccount } from "viem/accounts";
import {
  challengeInput,
  createChallenge,
  proofInput,
  verifyChallenge,
} from "@/server/wallet/proof";

const account = privateKeyToAccount(`0x${"11".repeat(32)}`);
const other = privateKeyToAccount(`0x${"22".repeat(32)}`);
const now = new Date("2026-09-24T12:00:00Z");
const origin = "https://grindly.example";
const member = "11111111-1111-4111-8111-111111111111";
function challenge() {
  return createChallenge(member, account.address, origin, now);
}

it("verifies an EOA signature for the server-issued challenge", async () => {
  const value = challenge();
  const signature = await account.signMessage({ message: value.message });
  await expect(
    verifyChallenge(value, member, signature, origin, now),
  ).resolves.toBeUndefined();
});

describe("rejects invalid wallet proofs", () => {
  for (const [label, changes] of Object.entries({
    replay: { consumed_at: now.toISOString() },
    expiry: { expires_at: now.toISOString() },
    domain: { domain: "evil.example" },
    uri: { uri: "https://evil.example/join" },
    chain: { chain_id: 1 },
    nonce: { nonce: "a".repeat(64) },
    message: { message: "I approve" },
    member: { member_id: "other" },
    future: { created_at: new Date(now.getTime() + 1_000).toISOString() },
  }))
    it(label, async () => {
      const value = challenge();
      const signature = await account.signMessage({ message: value.message });
      await expect(
        verifyChallenge(
          { ...value, ...changes },
          member,
          signature,
          origin,
          now,
        ),
      ).rejects.toThrow("invalid or expired");
    });
  it("another wallet's signature", async () => {
    const value = challenge();
    await expect(
      verifyChallenge(
        value,
        member,
        await other.signMessage({ message: value.message }),
        origin,
        now,
      ),
    ).rejects.toThrow();
  });
  it("a valid signature over a different domain", async () => {
    const value = createChallenge(
      member,
      account.address,
      "https://evil.example",
      now,
    );
    await expect(
      verifyChallenge(
        value,
        member,
        await account.signMessage({ message: value.message }),
        origin,
        now,
      ),
    ).rejects.toThrow();
  });
});

it("rejects client-supplied identity, wrong chain, and malformed proofs", () => {
  expect(
    challengeInput.safeParse({ address: account.address, chainId: 1 }).success,
  ).toBe(false);
  expect(
    challengeInput.safeParse({
      address: account.address,
      chainId: 46630,
      memberId: member,
    }).success,
  ).toBe(false);
  expect(
    proofInput.safeParse({ challengeId: member, signature: "0x" }).success,
  ).toBe(false);
});

it("generates unique challenges with a five-minute lifetime", () => {
  const a = challenge();
  const b = challenge();
  expect(a.nonce).not.toBe(b.nonce);
  expect(a.id).not.toBe(b.id);
  expect(Date.parse(a.expires_at) - Date.parse(a.created_at)).toBe(300_000);
});
