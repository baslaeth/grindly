import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { readFile, mkdir } from "node:fs/promises";
import { setTimeout } from "node:timers/promises";
import type { ResearchData } from "../../src/research/model";

test("local UI review with isolated identity and no research writes", async ({
  browser,
  baseURL,
}, info) => {
  test.skip(
    process.env.GRINDLY_UI_REVIEW !== "1",
    "Explicit local UI review only",
  );
  if (new URL(baseURL!).hostname !== "localhost")
    throw new Error("UI review is local only");
  const phase = process.env.GRINDLY_UI_PHASE === "before" ? "before" : "after";
  const folder = `docs/ui-review/${phase}/${info.project.name}`;
  await mkdir(folder, { recursive: true });
  const anonymous = await browser.newContext({ ...info.project.use, baseURL });
  const publicPage = await anonymous.newPage();
  await publicPage.goto("/join");
  await expect(
    publicPage.getByRole("heading", { name: "Join / Membership", exact: true }),
  ).toBeVisible();
  await publicPage.screenshot({ path: `${folder}/join.png`, fullPage: true });
  if (phase === "after") {
    await publicPage
      .getByRole("button", { name: "Play the core loop", exact: true })
      .click();
    await publicPage.getByRole("button", { name: "Pause explainer" }).click();
    for (let i = 0; i < 3; i++)
      await publicPage
        .getByRole("button", { name: "Next explainer scene" })
        .click();
    await publicPage
      .locator(".explainer")
      .screenshot({ path: `${folder}/explainer.png` });
  }
  await anonymous.close();
  const fixtures = JSON.parse(
    await readFile(".local/research-fixtures.json", "utf8"),
  ) as { email: string }[];
  const fixture = fixtures.find(
    (f) => f.email === "grindly-qa-research-project@example.test",
  );
  if (!fixture) throw new Error("Isolated identity missing");
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
      const r = await context.request.post("/api/auth/verify", {
        data: { code: otp.data.properties.email_otp },
      });
      const body = await r.json();
      if (body.error?.code === "INVALID_OTP" && i < 2) continue;
      expect(r.ok()).toBe(true);
      break;
    }
    const response = await context.request.get("/api/research");
    expect(response.ok()).toBe(true);
    const data = (await response.json()) as ResearchData;
    const demo = new Set(
      data.profiles.filter((p) => p.is_demo).map((p) => p.member_id),
    );
    if (
      data.findings.some((f) => !demo.has(f.author_id)) ||
      data.messages.some((m) => !demo.has(m.author_id))
    )
      throw new Error("Refusing screenshots containing genuine research");
    const own = data.findings.find(
      (f) => f.author_id === data.memberId && f.status === "accepted",
    )!;
    const page = await context.newPage();
    const errors: string[] = [];
    page.on("pageerror", () => errors.push("page_error"));
    for (const [name, path] of Object.entries({
      workbench: "/workbench",
      finding: "/findings/new",
      review: "/review",
      record: `/findings/${own.id}`,
      membership: "/membership",
    })) {
      await page.goto(path);
      await expect(
        page.getByText(
          "Illustrative QA account. Its work, reviews and credit are test activity, not customer validation.",
          { exact: true },
        ),
      ).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      if (info.project.name === "mobile")
        expect(
          (await page.locator(".sidebar").boundingBox())!.height,
        ).toBeLessThan(90);
      // Never include genuine participant names, even on an otherwise synthetic question.
      await page.screenshot({
        path: `${folder}/${name}.png`,
        fullPage: name !== "workbench",
        mask: [page.locator(".byline:not(:has(.sample-label))")],
      });
      if (name === "workbench") {
        await page
          .getByRole("link", { name: "Current accepted evidence brief" })
          .click();
        await page.screenshot({
          path: `${folder}/brief.png`,
          mask: [page.locator(".byline:not(:has(.sample-label))")],
        });
        if (phase === "after") {
          await expect(
            page.getByRole("tab", { name: "Evidence brief", exact: true }),
          ).toHaveAttribute("aria-selected", "true");
          await page
            .getByRole("tab", { name: "Evidence brief", exact: true })
            .focus();
          await page.keyboard.press("ArrowRight");
          await expect(
            page.getByRole("tab", { name: "Discussion", exact: true }),
          ).toBeFocused();
          await expect(
            page.getByRole("region", {
              name: "Specialist discussion",
              exact: true,
            }),
          ).toBeVisible();
          const history = page.locator(".history-disclosure");
          if (data.messages.length > 4) {
            await expect(history).not.toHaveAttribute("open", "");
            await history.locator(":scope > summary").click();
            await expect(
              page.locator(`#message-${data.messages[0]!.id}`),
            ).toBeVisible();
            await page.screenshot({
              path: `${folder}/discussion-history.png`,
              mask: [page.locator(".byline:not(:has(.sample-label))")],
            });
            await history.locator(":scope > summary").click();
            await page.goto(`/workbench#message-${data.messages[0]!.id}`);
            await expect(
              page.locator(`#message-${data.messages[0]!.id}`),
            ).toBeVisible();
          }
          await page
            .getByRole("link", { name: "Current accepted evidence brief" })
            .click();
          await expect(
            page.getByRole("region", {
              name: "Grind Intelligence evidence brief",
              exact: true,
            }),
          ).toBeVisible();
        }
      }
      if (name === "finding" && phase === "after") {
        await page
          .getByLabel("Main claim", { exact: true })
          .fill("ILLUSTRATIVE UI TEST: preserve this unsubmitted claim.");
        await page
          .getByLabel("Evidence URLs (one per line)", { exact: true })
          .fill("https://docs.robinhood.com/chain/");
        await page
          .getByLabel("What you added", { exact: true })
          .fill("ILLUSTRATIVE UI TEST: an unsubmitted distinction.");
        await page
          .getByLabel("Important limitations", { exact: true })
          .fill("Synthetic interface test only.");
        await page
          .getByLabel("Observation time (your local time)")
          .fill("2026-09-25T12:00");
        await page.getByRole("checkbox").check();
        let release!: () => void;
        const pending = new Promise<void>((resolve) => {
          release = resolve;
        });
        await page.route("**/api/research", async (route) => {
          await pending;
          await route.fulfill({
            status: 503,
            contentType: "application/json",
            body: JSON.stringify({
              error: {
                message: "Simulated unavailability. Your input is unchanged.",
              },
            }),
          });
        });
        await page
          .getByRole("button", { name: "Submit for review", exact: true })
          .click();
        await expect(
          page.getByRole("button", { name: "Saving...", exact: true }),
        ).toBeDisabled();
        release();
        await expect(
          page.locator(".research-form").getByRole("alert"),
        ).toHaveText("Simulated unavailability. Your input is unchanged.");
        await expect(
          page.getByLabel("Main claim", { exact: true }),
        ).toHaveValue("ILLUSTRATIVE UI TEST: preserve this unsubmitted claim.");
        await page.screenshot({
          path: `${folder}/finding-error.png`,
          fullPage: true,
        });
        await page.unroute("**/api/research");
      }
    }
    expect(errors).toEqual([]);
  } finally {
    await context.close();
  }
});
