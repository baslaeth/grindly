import { expect, it, vi } from "vitest";
import { unstable_doesMiddlewareMatch } from "next/experimental/testing/server";
import { config } from "@/proxy";
import { screens } from "@/config/screens";

vi.mock("server-only", () => ({}));

it("matches every research screen to the session-refresh proxy, including dynamic records", () => {
  for (const url of [
    ...screens.map((screen) => screen.href),
    "/findings/11111111-1111-4111-8111-111111111111",
  ]) {
    expect(
      unstable_doesMiddlewareMatch({ config, nextConfig: {}, url }),
      url,
    ).toBe(true);
  }
});
