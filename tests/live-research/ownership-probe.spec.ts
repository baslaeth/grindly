import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { setTimeout } from "node:timers/promises";

test("read-only protected ownership and mobile layout probe", async ({
  browser,
  baseURL,
}, info) => {
  test.skip(
    process.env.GRINDLY_PROBE !== "1",
    "Explicit read-only probe opt-in required",
  );
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
  const samples: Record<string, unknown>[] = [];
  let stage = "fixture_auth";
  const safeId = (id: string | null) =>
    id && /^[a-zA-Z0-9:_-]{1,160}$/.test(id) ? id : null;
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
      if (otp.error) throw new Error("Fixture authentication unavailable");
      const result = await context.request.post("/api/auth/verify", {
        data: { code: otp.data.properties.email_otp },
      });
      const body = await result.json();
      if (body.error?.code === "INVALID_OTP" && i < 2) continue;
      expect(result.ok()).toBe(true);
      break;
    }
    for (const path of [
      "/workbench",
      "/findings/new",
      "/review",
      "/membership",
    ]) {
      stage = path;
      const started = Date.now();
      const response = await page.goto(path);
      const sample: Record<string, unknown> = {
        stage,
        status: response?.status(),
        requestId: safeId(
          (await response?.headerValue("x-request-id")) ?? null,
        ),
        vercelId: safeId((await response?.headerValue("x-vercel-id")) ?? null),
        completion: "pending",
        classification: "pending",
      };
      samples.push(sample);
      const completion = await response?.finished();
      sample.completion = completion ? "failed" : "complete";
      sample.elapsedMs = Date.now() - started;
      sample.classification = (await page
        .getByText("Ownership check unavailable. Please retry.", {
          exact: true,
        })
        .count())
        ? "ownership_unavailable"
        : "rendered";
      expect(sample.classification).toBe("rendered");
      await expect(
        page.getByText("Research unavailable", { exact: true }),
      ).toHaveCount(0);
      if (path === "/workbench") {
        await expect(
          page.getByRole("link", { name: "Contribute evidence", exact: true }),
        ).toBeVisible();
        await expect(
          page.getByRole("region", {
            name: "Grind Intelligence evidence brief",
            exact: true,
          }),
        ).toBeVisible();
      }
      if (info.project.name === "mobile") {
        sample.sidebarHeight = (await page
          .locator(".sidebar")
          .boundingBox())!.height;
        expect(sample.sidebarHeight).toBeLessThan(90);
      }
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await page.screenshot({
        path: info.outputPath(`${path.replaceAll("/", "-")}.png`),
      });
    }
  } finally {
    await mkdir(".local/reliability-probes", { recursive: true });
    const url = new URL(page.url());
    await writeFile(
      `.local/reliability-probes/protected-${new URL(baseURL!).hostname}-${info.project.name}-${Date.now()}.json`,
      JSON.stringify(
        { stage, finalURL: url.origin + url.pathname, samples },
        null,
        2,
      ),
    );
    await context.close();
  }
});
