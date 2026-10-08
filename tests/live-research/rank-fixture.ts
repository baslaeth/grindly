import {
  expect,
  type Browser,
  type BrowserContextOptions,
} from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { readFile } from "node:fs/promises";
import { setTimeout } from "node:timers/promises";
import type { ResearchData } from "../../src/research/model";

export async function rankFixture(
  browser: Browser,
  baseURL: string,
  use: BrowserContextOptions,
  hosted = false,
  specialty: "project" | "risk" | "operations" = "project",
) {
  if (
    hosted
      ? baseURL !== "https://grindly-woad.vercel.app"
      : new URL(baseURL).hostname !== "localhost"
  )
    throw new Error("Unexpected review destination");
  const fixtures = JSON.parse(
    await readFile(".local/research-fixtures.json", "utf8"),
  ) as { email: string; member: string }[];
  const fixture = fixtures.find(
    (f) => f.email === `grindly-qa-research-${specialty}@example.test`,
  );
  if (!fixture) throw new Error("Existing isolated QA identity required");
  const db = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    { auth: { persistSession: false } },
  );
  const context = await browser.newContext({
    ...use,
    baseURL,
    extraHTTPHeaders: { Origin: baseURL },
  });
  let stage = "returning_intent";
  let safeFailure = "";
  try {
    expect(
      (
        await context.request.post("/api/auth/otp", {
          data: { mode: "returning", email: fixture.email },
        })
      ).ok(),
    ).toBe(true);
    for (let i = 0; i < 3; i++) {
      stage = "fixture_verification";
      await setTimeout(5000);
      const otp = await db.auth.admin.generateLink({
        type: "magiclink",
        email: fixture.email,
      });
      if (otp.error) throw new Error("Fixture OTP unavailable");
      const response = await context.request.post("/api/auth/verify", {
        data: { code: otp.data.properties.email_otp },
      });
      const result = await response.json();
      if (result.error?.code === "INVALID_OTP" && i < 2) continue;
      expect(response.ok(), "Isolated QA verification").toBe(true);
      break;
    }
    stage = "protected_snapshot";
    const response = await context.request.get("/api/research", {
      timeout: 90000,
    });
    if (!response.ok()) {
      const body = await response.json().catch(() => ({}));
      const code = String(body.error?.code ?? "UNKNOWN");
      safeFailure = ` HTTP ${response.status()} ${/^[A-Z_]{1,60}$/.test(code) ? code : "UNKNOWN"}`;
    }
    expect(response.ok(), `Snapshot status ${response.status()}`).toBe(true);
    stage = "snapshot_json";
    const data = (await response.json()) as ResearchData;
    stage = "snapshot_identity";
    expect(data.memberId).toBe(fixture.member);
    expect(data.token.tier).toBe("Bronze");
    stage = "sample_isolation";
    const demo = new Set(
      data.profiles.filter((p) => p.is_demo).map((p) => p.member_id),
    );
    if (
      data.messages.some((m) => !demo.has(m.author_id)) ||
      data.findings.some((f) => !demo.has(f.author_id))
    )
      throw new Error("Refusing captures of genuine research");
    return { context, data, fixture };
  } catch {
    await context.close();
    // Playwright transport errors can include request cookies. Never forward them.
    throw new Error(
      `Isolated fixture setup failed at ${stage}${safeFailure}; no request headers recorded`,
    );
  }
}
