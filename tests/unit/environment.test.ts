import { describe, expect, it } from "vitest";
import { parseEnvironment } from "@/config/environment";

describe("environment validation", () => {
  it("allows a foundation build without external credentials", () => {
    expect(parseEnvironment({}).CHAIN_ID).toBe(46630);
  });
  it("rejects a different chain", () => {
    expect(() => parseEnvironment({ CHAIN_ID: "1" })).toThrow("CHAIN_ID");
  });
  it("requires auth credentials once authentication is enabled", () => {
    expect(() => parseEnvironment({ GRINDLY_STAGE: "auth" })).toThrow("SUPABASE_URL");
  });
  it("requires a deployment and issuer for membership", () => {
    expect(() => parseEnvironment({ GRINDLY_STAGE: "membership", SUPABASE_URL: "https://example.supabase.co", SUPABASE_PUBLISHABLE_KEY: "public-key", SUPABASE_SECRET_KEY: "secret-key" })).toThrow("MEMBERSHIP_CONTRACT_ADDRESS");
  });
  it("never includes secret values in errors", () => {
    expect(() => parseEnvironment({ ISSUER_PRIVATE_KEY: "sensitive-test-value" })).toThrow(/^Invalid environment: ISSUER_PRIVATE_KEY$/);
  });
  it("rejects non-HTTP endpoints", () => {
    expect(() => parseEnvironment({ SUPABASE_URL: "file:///secret" })).toThrow("SUPABASE_URL");
  });
});
