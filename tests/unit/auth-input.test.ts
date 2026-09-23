import { describe, expect, it } from "vitest";
import {
  hashInvitation,
  otpRequest,
  otpVerification,
} from "@/server/auth/input";
import { assertSameOrigin, errorResponse, readJson } from "@/server/http";

describe("authentication request boundary", () => {
  it("normalizes email without treating an invitation as member identity", () => {
    const input = otpRequest.parse({
      mode: "join",
      email: " Invited@Example.test ",
      invitation: "a".repeat(64),
    });
    expect(input.email).toBe("invited@example.test");
    expect(hashInvitation("a".repeat(64))).toMatch(/^[a-f0-9]{64}$/);
    expect(hashInvitation("a".repeat(64))).not.toBe("a".repeat(64));
  });
  it("rejects a caller-supplied member ID", () => {
    expect(
      otpVerification.safeParse({ code: "123456", memberId: "forged" }).success,
    ).toBe(false);
  });
  it("rejects missing and cross-site origins even when Host is forged", () => {
    for (const origin of [undefined, "https://attacker.test", "null"]) {
      const request = new Request("https://grindly.test/api/auth/otp", {
        headers: origin
          ? { origin, host: "grindly.test" }
          : { host: "grindly.test" },
      });
      expect(() => assertSameOrigin(request, "https://grindly.test")).toThrow(
        "origin",
      );
    }
  });
  it("accepts only the configured app origin", () => {
    expect(() =>
      assertSameOrigin(
        new Request("https://grindly.test", {
          headers: { origin: "https://grindly.test" },
        }),
        "https://grindly.test",
      ),
    ).not.toThrow();
  });
  it("enforces body limits without trusting Content-Length", async () => {
    const request = new Request("https://grindly.test", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ code: "1".repeat(5000) }),
    });
    await expect(readJson(request, otpVerification)).rejects.toThrow(
      "too large",
    );
  });
  it("rejects malformed JSON and non-JSON requests", async () => {
    for (const headers of [
      { "content-type": "application/json" },
      { "content-type": "text/plain" },
    ]) {
      const request = new Request("https://grindly.test", {
        method: "POST",
        headers,
        body: "not-json",
      });
      await expect(readJson(request, otpVerification)).rejects.toThrow();
    }
  });
  it("does not expose upstream errors or allow caching", async () => {
    const response = errorResponse(new Error("secret-key-and-personal-data"));
    expect(response.status).toBe(503);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.text()).not.toContain("secret-key-and-personal-data");
  });
});
