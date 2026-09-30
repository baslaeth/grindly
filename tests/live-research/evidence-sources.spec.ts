import { test, expect } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { rankFixture } from "./rank-fixture";
import { fillUnknownContext } from "./evaluation-helpers";
import type { ResearchData } from "../../src/research/model";

test("saved public observations are readable through the member intelligence click path", async ({
  browser,
  baseURL,
}, info) => {
  const { context } = await rankFixture(browser, baseURL!, info.project.use);
  const page = await context.newPage();
  let stage = "room_navigation";
  try {
    await page.goto("/workbench?room=bronze-traders");
    await page
      .getByRole("link", { name: "Submit alpha", exact: true })
      .last()
      .click();
    await page
      .getByLabel("Contribution category", { exact: true })
      .selectOption("Traders");
    await page
      .getByLabel("Contribution type", { exact: true })
      .selectOption("analysis");
    await fillUnknownContext(page, "Traders");
    await page.getByLabel("Subject or project").fill("ETH");
    await page
      .getByLabel("What did you find or conclude?")
      .fill(
        `Sample provider observation ${info.project.name} ${Date.now()}: public ETH data is a reference, not a forecast or token safety conclusion.`,
      );
    await page
      .getByLabel("Why does it matter to members?")
      .fill(
        "Isolated demonstration of dated price, liquidity and risk observations. Not genuine investment research.",
      );
    await page
      .getByLabel("What did you personally discover, test, or add?")
      .fill(
        "Compared provider coverage and recorded missing data. This is labeled sample work.",
      );
    await page
      .getByLabel("What is uncertain or risky?")
      .fill(
        "Single-venue and provider snapshots cannot establish historical price paths, safety or future returns.",
      );
    await page.getByText("Additional provenance", { exact: true }).click();
    await page
      .getByLabel("Chain or network (optional)", { exact: true })
      .fill("1");
    await page
      .getByLabel("Asset or contract identifier (optional)", { exact: true })
      .fill("0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2");
    await page
      .getByLabel("Links or transaction hashes (one per line)", { exact: true })
      .fill(
        "https://docs.cdp.coinbase.com/api-reference/exchange-api/rest-api/products/get-product-candles.md\nhttps://defillama.com/protocol/aave",
      );
    await page.getByRole("checkbox").check();
    stage = "save";
    await page
      .getByRole("button", { name: "Submit for review", exact: true })
      .click();
    await expect(page.getByText(/^Alpha saved:/)).toBeVisible({
      timeout: 30000,
    });
    const id = new URL(page.url()).pathname.split("/").at(-1)!;
    const snapshot = async () =>
      (await (
        await context.request.get("/api/research")
      ).json()) as ResearchData;
    let data = await snapshot();
    const version = data.findings.find((f) => f.id === id)!.current_version!;
    stage = "saved_sources";
    await expect
      .poll(
        async () => {
          data = await snapshot();
          return data.sourceChecks?.find((r) => r.version_id === version)
            ?.status;
        },
        { timeout: 45000 },
      )
      .toBe("complete");
    const sources = data.sourceChecks!.find(
      (r) => r.version_id === version,
    )!.sources;
    for (const provider of [
      "DEX Screener",
      "GoPlus token risk flags",
      "DefiLlama current price",
    ])
      expect(sources.find((s) => s.label === provider)).toBeDefined();
    expect(sources.some((s) => s.status === "retrieved")).toBe(true);
    stage = "intelligence_navigation";
    await page
      .getByRole("link", { name: "Explore in Grind Intelligence" })
      .first()
      .click();
    await expect(page).toHaveURL(`/intelligence?alpha=${id}`);
    await page.getByText("What sources were checked?", { exact: true }).click();
    const source = page.locator("li").filter({
      has: page.getByRole("link", { name: "DEX Screener", exact: true }),
    });
    await source
      .getByText("What was retrieved and its limits", { exact: true })
      .click();
    await expect(source).toContainText(
      "rolling volume is not historical coverage",
    );
    await expect(
      page.locator(".topbar").getByRole("link", { name: "My profile" }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    const dir = `docs/evidence-sources/${info.project.name}`;
    await mkdir(dir, { recursive: true });
    await page.screenshot({
      path: `${dir}/saved-evidence.png`,
      fullPage: true,
    });
    await page.evaluate(() => window.scrollTo(0, 0));
    const nav = page.getByRole("button", { name: "Open navigation" });
    if (await nav.isVisible()) await nav.click();
    await page.screenshot({ path: `${dir}/sidebar.png` });
    await page.reload();
    await expect(page.getByLabel("Select an alpha")).toHaveValue(id);
    if (process.env.OLLAMA_MODEL) {
      stage = "local_model_persistence";
      await page
        .getByRole("button", {
          name: "Run local preliminary analysis",
          exact: true,
        })
        .click();
      await expect(
        page.getByRole("button", {
          name: "Run local preliminary analysis",
          exact: true,
        }),
      ).toBeEnabled({ timeout: 60000 });
      data = await snapshot();
      const run = data.preliminary?.find(
        (r) => r.version_id === version && r.provider === "ollama-local",
      );
      expect(
        run,
        "Real model attempt must persist an honest status; no mocked result",
      ).toBeDefined();
      expect(["complete", "failed"]).toContain(run?.status);
      expect(data.findings.find((f) => f.id === id)?.status).toBe("pending");
      expect(data.awards.some((a) => a.finding_id === id)).toBe(false);
      await page.reload();
      if (run?.status === "complete") {
        expect(run.card?.claims.length).toBeGreaterThan(0);
        await expect(
          page.getByText(/Preliminary analysis saved/),
        ).toBeVisible();
      } else {
        expect(run?.card).toBeNull();
        expect(["invalid_output", "provider_failed"]).toContain(
          run?.error_code,
        );
        await expect(
          page.getByText(
            /Analysis unavailable or failed validation; no conclusion saved/,
          ),
        ).toBeVisible();
        await expect(
          page.getByRole("button", {
            name: "Run local preliminary analysis",
            exact: true,
          }),
        ).toBeEnabled();
      }
      // Report actual model status, never count a truthful error UI as model accuracy.
      await writeFile(
        `${dir}/local-analysis-status.json`,
        JSON.stringify(
          {
            status: run?.status,
            error: run?.error_code,
            model: run?.model,
            createdAt: run?.created_at,
            isolated: true,
            scope:
              "Real call and persistence; failed output is not a working model result",
          },
          null,
          2,
        ) + "\n",
      );
      console.log(
        `${info.project.name}: local model ${run?.status} (${run?.error_code ?? "validated"}); alpha pending, no award`,
      );
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.screenshot({
        path: `${dir}/local-analysis.png`,
        fullPage: true,
      });
    }
  } catch (error) {
    await page
      .screenshot({
        path: `.local/evidence-source-failure-${info.project.name}.png`,
      })
      .catch(() => undefined);
    throw new Error(
      `Isolated free-source walkthrough failed at ${stage} (${error instanceof Error ? error.name : "unknown"}); no credentials logged`,
    );
  } finally {
    await context.close();
  }
});
