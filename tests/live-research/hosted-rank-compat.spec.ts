import { test, expect } from "@playwright/test";
import { rankFixture } from "./rank-fixture";
import { writeFile } from "node:fs/promises";

test("older hosted executable remains compatible with the additive rank schema", async ({
  browser,
  baseURL,
}, info) => {
  test.skip(
    process.env.GRINDLY_HOSTED_COMPAT !== "1",
    "Explicit read-only production compatibility check",
  );
  const { context, data } = await rankFixture(
    browser,
    baseURL!,
    info.project.use,
    true,
  );
  const page = await context.newPage();
  let stage = "snapshot";
  const diagnostics: {
    path: string;
    status: number;
    requestId: string | null;
    completion: string;
  }[] = [];
  page.on("response", async (response) => {
    const path = new URL(response.url()).pathname;
    if (!/^\/(workbench|findings|review|membership)(\/|$)/.test(path)) return;
    const id =
      (await response.headerValue("x-request-id")) ??
      (await response.headerValue("x-vercel-id"));
    const entry = {
      path,
      status: response.status(),
      requestId: id && /^[a-zA-Z0-9:_-]{1,160}$/.test(id) ? id : null,
      completion: "pending",
    };
    diagnostics.push(entry);
    entry.completion = await response
      .finished()
      .then((e) => (e ? "failed" : "complete"))
      .catch(() => "failed");
  });
  try {
    expect(data.rooms).toHaveLength(10);
    expect(data.rooms!.every((r) => r.rank === "Bronze")).toBe(true);
    expect(data.demoProfiles!.every((p) => p.rank === "Bronze")).toBe(true);
    expect(data.directory!.every((p) => p.tier === "Bronze")).toBe(true);
    expect(JSON.stringify(data.directory)).not.toContain("@");
    const roomIds = new Set(data.rooms!.map((r) => r.id));
    expect(data.messages.every((m) => roomIds.has(m.question_id))).toBe(true);
    expect(data.findings.every((f) => roomIds.has(f.question_id))).toBe(true);
    const errors: string[] = [];
    page.on("pageerror", () => errors.push("page_error"));
    for (const path of [
      "/workbench",
      "/findings/new",
      "/review",
      "/membership",
    ]) {
      stage = path;
      const response = await page.goto(path);
      expect(response?.status()).toBe(200);
      await expect(
        page.getByText(
          "Illustrative QA account. Its work, reviews and credit are test activity, not customer validation.",
          { exact: true },
        ),
      ).toBeVisible();
      await expect(
        page.getByText(
          "Research or ownership check unavailable. Please reload to retry.",
          { exact: true },
        ),
      ).toHaveCount(0);
      console.log(
        `hosted read-only compatibility: ${path} 200; QA authenticated; no research writes`,
      );
    }
    const metadata = await context.request.get(
      `/api/metadata/46630/${data.token.id}`,
    );
    expect(metadata.ok()).toBe(true);
    expect(JSON.stringify(await metadata.json())).not.toContain(
      "@example.test",
    );
    expect(errors).toEqual([]);
    console.log("hosted metadata: 200; no personal data; no page errors");
  } catch (error) {
    await writeFile(
      info.outputPath("sanitized-hosted-compat.json"),
      JSON.stringify({
        stage,
        finalURL: new URL(page.url()).pathname,
        responses: diagnostics,
        classification: (await page
          .getByText(
            "Research or ownership check unavailable. Please reload to retry.",
            { exact: true },
          )
          .count())
          ? "safe_service_unavailable"
          : "assertion_or_request_failure",
      }),
    );
    throw error;
  } finally {
    await context.close();
  }
});
