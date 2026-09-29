import { test, expect, type Page } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import sharp from "sharp";
import { rankFixture } from "./rank-fixture";
import type { ResearchData } from "../../src/research/model";
import { alphaCategories } from "../../src/alpha/model";
import { fillUnknownContext } from "./evaluation-helpers";
test("category alpha shares pending evidence, retries once, and records truthful source checks", async ({
  browser,
  baseURL,
}, info) => {
  const author = await rankFixture(
    browser,
    baseURL!,
    info.project.use,
    false,
    "project",
  );
  const peer = await rankFixture(
    browser,
    baseURL!,
    info.project.use,
    false,
    "risk",
  );
  let page: Page | undefined;
  let stage = "home";
  const responses: {
    path: string;
    status: number;
    requestId: string | null;
  }[] = [];
  const snap = async () => {
    const r = await author.context.request.get("/api/research");
    expect(r.ok()).toBe(true);
    return r.json() as Promise<ResearchData>;
  };
  try {
    expect(
      author.data.alphaSchemaAvailable,
      "Approved alpha migration required",
    ).toBe(true);
    page = await author.context.newPage();
    page.on("response", (r) => {
      if (new URL(r.url()).pathname === "/api/alpha")
        responses.push({
          path: "/api/alpha",
          status: r.status(),
          requestId: r.headers()["x-request-id"] ?? null,
        });
    });
    await page.goto("/");
    await page.getByRole("link", { name: "Enter Hub", exact: true }).click();
    if (info.project.name === "mobile")
      await page
        .getByRole("combobox", { name: "Room", exact: true })
        .selectOption("bronze-traders");
    else
      await page
        .getByRole("navigation", { name: "Bronze rooms" })
        .getByRole("link", { name: /^Traders/ })
        .click();
    await expect(
      page.getByRole("heading", { name: "Bronze / Traders chat" }),
    ).toBeVisible({ timeout: 20000 });
    stage = "category_editor";
    await page
      .getByRole("link", { name: "Submit alpha", exact: true })
      .last()
      .click();
    await expect(page).toHaveURL(/\/findings\/new\?room=bronze-traders$/, {
      timeout: 20000,
    });
    await expect(
      page.getByLabel("Contribution category", { exact: true }),
    ).toBeVisible({ timeout: 20000 });
    await expect(
      page.getByLabel("Contribution category", { exact: true }),
    ).toHaveValue("Traders");
    expect(
      await page
        .getByLabel("Contribution category", { exact: true })
        .locator("option:not([disabled])")
        .allTextContents(),
    ).toEqual([...alphaCategories]);
    await fillUnknownContext(page, "Traders");
    await page
      .getByLabel("Contribution type", { exact: true })
      .selectOption("prediction");
    const tag = `Isolated sample market observation ${info.project.name} ${Date.now()}`;
    await page.getByLabel("Subject or project").fill("ETH");
    await page.getByLabel("What did you find or conclude?").fill(tag);
    await page
      .getByLabel("Why does it matter to members?")
      .fill("A sample demonstrates where reliable evidence is still missing.");
    await page
      .getByLabel("What did you personally discover, test, or add?")
      .fill(
        "Compared the public spot snapshot; this isolated example makes no prediction of returns.",
      );
    await page
      .getByLabel("What is uncertain or risky?")
      .fill("A current spot quote does not establish the future outcome.");
    await page
      .getByLabel("Horizon or milestone (UTC)")
      .fill(new Date(Date.now() + 86400000).toISOString().slice(0, 16));
    await page
      .getByLabel(
        "What would count against the claim or establish the outcome?",
      )
      .fill(
        "Compare the timestamped source when due; absent historical data remains Unknown.",
      );
    const png = await sharp({
      create: { width: 160, height: 90, channels: 3, background: "#dddddd" },
    })
      .png()
      .toBuffer();
    await page.getByLabel("Attach evidence", { exact: true }).setInputFiles({
      name: "isolated-example.png",
      mimeType: "image/png",
      buffer: png,
    });
    await page.getByRole("checkbox").check();
    let interrupted = false;
    await page.route("**/api/alpha", async (route) => {
      if (!interrupted && route.request().postDataJSON()?.action === "submit") {
        interrupted = true;
        try {
          const r = await route.fetch();
          expect(r.ok()).toBe(true);
          await route.abort("failed");
        } catch {
          throw new Error(
            "Isolated interrupted-response probe failed; no request headers recorded",
          );
        }
      } else await route.continue();
    });
    stage = "failed_response_retry";
    await page
      .getByRole("button", { name: "Submit for review", exact: true })
      .click();
    await expect(page.getByRole("alert")).toBeVisible({ timeout: 30000 });
    await expect(page.getByLabel("What did you find or conclude?")).toHaveValue(
      tag,
    );
    await page
      .getByRole("button", { name: "Submit for review", exact: true })
      .click();
    await expect(page).toHaveURL(
      /\/findings\/[a-f0-9-]{36}\?saved=[a-f0-9-]{36}$/,
      {
        timeout: 30000,
      },
    );
    await page.unroute("**/api/alpha");
    let s = await snap();
    const finding = s.findings.find((f) =>
      s.versions.some((v) => v.finding_id === f.id && v.claim === tag),
    )!;
    expect(finding.status).toBe("pending");
    expect(s.versions.filter((v) => v.claim === tag)).toHaveLength(1);
    expect(s.awards.filter((a) => a.finding_id === finding.id)).toHaveLength(0);
    const version = finding.current_version!;
    stage = "persisted_source_check";
    await expect
      .poll(
        async () => {
          s = await snap();
          return s.sourceChecks?.find((r) => r.version_id === version)?.status;
        },
        { timeout: 30000 },
      )
      .toBe("complete");
    const run = s.sourceChecks!.find((r) => r.version_id === version)!;
    expect(
      run.sources.some(
        (s) =>
          s.id === "market" &&
          s.status === "retrieved" &&
          s.checkedAt &&
          s.digest,
      ),
    ).toBe(true);
    expect(s.preliminary?.some((r) => r.version_id === version && r.card)).toBe(
      false,
    );
    const media = s
      .alphas!.find((a) => a.version_id === version)!
      .evidence.find((e) => e.kind === "attachment")!;
    const image = await peer.context.request.get(
      `/api/chat/media?id=${media.value}&alpha=${version}`,
    );
    expect(image.ok()).toBe(true);
    expect(image.headers()["cache-control"]).toContain("no-store");
    const p = await peer.context.newPage();
    await p.goto("/workbench?room=bronze-traders");
    await p.getByText(/Shared alpha \(/).click();
    await p.getByRole("link", { name: tag, exact: true }).click();
    await expect(
      p.getByText("Pending evaluation", { exact: true }).first(),
    ).toBeVisible({ timeout: 20000 });
    stage = "peer_feedback";
    await p.getByText("Add sourced feedback", { exact: true }).click();
    await p
      .getByLabel("Evidence and feedback")
      .fill(
        "Isolated sourced challenge: a spot snapshot alone cannot support a future price conclusion.",
      );
    await p
      .getByLabel("Supporting source", { exact: true })
      .fill(
        "https://docs.cdp.coinbase.com/api-reference/exchange-api/rest-api/products/get-product-ticker",
      );
    await p.getByRole("button", { name: "Send sourced feedback" }).click();
    await expect(
      p.getByText("Recorded. This does not approve work or award XP."),
    ).toBeVisible({ timeout: 20000 });
    await page.reload();
    await expect(
      page.getByText("Isolated sourced challenge:", { exact: false }),
    ).toBeVisible({ timeout: 20000 });
    await expect(
      page.getByText("Outcome pending.", { exact: false }),
    ).toBeVisible();
    const dir = `docs/alpha-review/${info.project.name}`;
    await mkdir(dir, { recursive: true });
    await page.screenshot({ path: `${dir}/market-alpha.png`, fullPage: true });
    await page
      .locator(".topbar")
      .getByRole("link", { name: "My profile" })
      .click();
    await expect(
      page.getByRole("heading", { name: "Your NFT progression" }),
    ).toBeVisible({ timeout: 30000 });
    await expect(
      page.getByRole("button", { name: "Claim $GRIND" }),
    ).toBeDisabled();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  } catch (e) {
    if (page && new URL(page.url()).origin === baseURL)
      await page
        .screenshot({ path: info.outputPath("isolated-alpha-failure.png") })
        .catch(() => undefined);
    await writeFile(
      info.outputPath("sanitized-alpha-failure.json"),
      JSON.stringify({
        stage,
        finalURL: page ? new URL(page.url()).pathname : null,
        responses: responses.slice(-8),
        classification:
          e instanceof Error && e.name === "TimeoutError"
            ? "timeout"
            : "assertion_or_request_failure",
      }),
    );
    throw new Error(
      `Category-alpha journey failed at ${stage}; sanitized diagnostics saved`,
    );
  } finally {
    await author.context.close();
    await peer.context.close();
  }
});
