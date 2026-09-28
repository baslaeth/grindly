import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { setTimeout } from "node:timers/promises";
import type { ResearchData } from "../../src/research/model";

test("local rank rooms, permitted profiles and delegation attribution", async ({
  browser,
  baseURL,
}, info) => {
  if (new URL(baseURL!).hostname !== "localhost")
    throw new Error("Rank review is local only");
  const fixtures = JSON.parse(
    await readFile(".local/research-fixtures.json", "utf8"),
  ) as { email: string }[];
  const fixture = fixtures.find(
    (f) => f.email === "grindly-qa-research-project@example.test",
  );
  if (!fixture) throw new Error("Isolated QA identity required");
  const db = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    { auth: { persistSession: false } },
  );
  const context = await browser.newContext({
    ...info.project.use,
    baseURL,
    extraHTTPHeaders: { Origin: baseURL! },
  });
  const page = await context.newPage();
  let stage = "fixture_auth";
  const responses: {
    status: number;
    requestId: string | null;
    path: string;
  }[] = [];
  page.on("response", async (r) => {
    const id = await r.headerValue("x-request-id");
    responses.push({
      status: r.status(),
      requestId: id && /^[a-zA-Z0-9:_-]{1,160}$/.test(id) ? id : null,
      path: new URL(r.url()).pathname,
    });
  });
  try {
    expect(
      (
        await context.request.post("/api/auth/otp", {
          data: { mode: "returning", email: fixture.email },
        })
      ).ok(),
    ).toBe(true);
    for (let i = 0; i < 3; i++) {
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
      expect(response.ok()).toBe(true);
      break;
    }
    stage = "rank_snapshot";
    const result = await context.request.get("/api/research");
    expect(result.ok()).toBe(true);
    const data: ResearchData = await result.json();
    expect(data.token.tier).toBe("Bronze");
    expect(data.rooms).toHaveLength(10);
    expect(data.rooms!.every((r) => r.rank === "Bronze")).toBe(true);
    expect(data.demoProfiles).toHaveLength(5);
    expect(JSON.stringify(data.directory)).not.toContain("@");
    const demos = new Set(
      data.profiles.filter((p) => p.is_demo).map((p) => p.member_id),
    );
    if (
      data.messages.some((m) => !demos.has(m.author_id)) ||
      data.findings.some((f) => !demos.has(f.author_id))
    )
      throw new Error("Refusing screenshots containing genuine research");
    const folder = `docs/rank-spaces-review/${info.project.name}`;
    await mkdir(folder, { recursive: true });
    const capture = async (name: string) => {
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await page.screenshot({
        path: `${folder}/${name}.png`,
        caret: "initial",
        mask: [
          page.locator(".member-directory li:not(:has(.sample-label))"),
          page.locator(".byline:not(:has(.sample-label))"),
        ],
      });
    };
    stage = "populated_room";
    await page.goto("/workbench");
    await expect(
      page.getByRole("heading", { name: "General", exact: true }),
    ).toBeVisible();
    await capture("bronze-general");
    await page.getByRole("tab", { name: "Discussion", exact: true }).click();
    const exchange = page.locator(".demo-conversation");
    await expect(exchange).toContainText("working for");
    await exchange.scrollIntoViewIfNeeded();
    await capture("delegation-conversation");
    await exchange.getByRole("link", { name: "Alex", exact: true }).click();
    await expect(page).toHaveURL(/profile=demo-alex$/, { timeout: 30000 });
    stage = "delegate_profile";
    const dialog = page.getByRole("dialog");
    await expect(
      dialog.getByRole("heading", { name: "Alex", exact: true }),
    ).toBeVisible();
    await expect(dialog).toContainText("Fictional profile, XP and NFT history");
    await expect(dialog).toContainText("40");
    await capture("alex-profile");
    await dialog
      .getByRole("link", { name: "David's NFT", exact: true })
      .click();
    await expect(page).toHaveURL(/profile=demo-david$/, { timeout: 30000 });
    await expect(
      dialog.getByRole("heading", { name: "David", exact: true }),
    ).toBeVisible();
    await expect(dialog).toContainText("60");
    await expect(dialog).toContainText("20");
    await capture("david-profile");
    await page.keyboard.press("Escape");
    await expect(page).toHaveURL(/#space-members$/, { timeout: 30000 });
    await expect(dialog).toHaveCount(0);
    stage = "empty_room";
    await page.goto("/workbench?room=bronze-seed-and-early-stage-investors");
    await expect(
      page.getByRole("heading", {
        name: "Seed and Early Stage Investors",
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Contribute evidence", exact: true }),
    ).toHaveAttribute(
      "href",
      "/findings/new?room=bronze-seed-and-early-stage-investors",
    );
    await capture("empty-room");
    await page
      .getByRole("link", { name: "Contribute evidence", exact: true })
      .click();
    await expect(page).toHaveURL(
      /\/findings\/new\?room=bronze-seed-and-early-stage-investors$/,
      { timeout: 30000 },
    );
    await expect(page.getByLabel("Main claim", { exact: true })).toBeVisible();
    stage = "cross_rank_denial";
    for (const path of [
      "/api/research?room=silver-general",
      "/api/research?profile=demo-sam",
    ]) {
      const denied = await context.request.get(path);
      expect([403, 404]).toContain(denied.status());
      expect(JSON.stringify(await denied.json())).not.toContain(
        "fictional_profiles",
      );
    }
    const deniedPost = await context.request.post("/api/research", {
      data: {
        action: "message",
        room: "silver-general",
        body: "DEMO QA denied cross-rank attempt",
        reply: null,
        sources: [],
      },
    });
    expect(deniedPost.status()).toBe(409);
    for (const path of [
      "/workbench?room=silver-general",
      "/findings/new?room=silver-general",
      "/workbench?profile=demo-sam",
    ]) {
      await page.goto(path);
      await expect(
        page.getByRole("link", { name: "Return to your space" }),
      ).toBeVisible();
      await expect(page.getByLabel("Main claim", { exact: true })).toHaveCount(
        0,
      );
      await capture(
        "unavailable-" +
          (path.includes("findings")
            ? "editor"
            : path.includes("profile")
              ? "profile"
              : "room"),
      );
    }
    console.log(
      `${info.project.name}: live Bronze rank/profile boundaries; fictional delegate attribution; no research writes`,
    );
  } catch (error) {
    await writeFile(
      info.outputPath("sanitized-rank-failure.json"),
      JSON.stringify({
        stage,
        finalURL: new URL(page.url()).pathname,
        responses: responses.slice(-15),
        classification:
          error instanceof Error && error.name === "TimeoutError"
            ? "timeout"
            : "assertion_or_request_failure",
      }),
    );
    throw error;
  } finally {
    await context.close();
  }
});
