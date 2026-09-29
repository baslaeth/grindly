import { test, expect } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { rankFixture } from "./rank-fixture";
import type { ResearchData } from "../../src/research/model";
import { explicitUnknownContext } from "../fixtures/evaluation-cases";

test("isolated near-term fixture matures and records an inconclusive check, never a fabricated success", async ({
  browser,
  baseURL,
}, info) => {
  const { context, data, fixture } = await rankFixture(
    browser,
    baseURL!,
    info.project.use,
  );
  expect(
    data.profiles.find((p) => p.member_id === fixture.member)?.is_demo,
  ).toBe(true);
  expect(Number.isFinite(Date.parse(data.serverTime!))).toBe(true);
  const horizon = new Date(Date.parse(data.serverTime!) + 45000).toISOString();
  const claim = `Isolated timed fixture ${info.project.name} ${Date.now()}: no real market prediction is claimed.`;
  const page = await context.newPage();
  let reviewerContext:
    Awaited<ReturnType<typeof rankFixture>>["context"] | undefined;
  const responses: {
    path: string;
    status: number;
    requestId: string | null;
    completion: string;
  }[] = [];
  page.on("response", async (response) => {
    const path = new URL(response.url()).pathname;
    if (path !== "/api/alpha") return;
    const id = response.headers()["x-request-id"];
    const entry = {
      path,
      status: response.status(),
      requestId: id && /^[a-zA-Z0-9:_-]{1,160}$/.test(id) ? id : null,
      completion: "pending",
    };
    responses.push(entry);
    entry.completion = await response
      .finished()
      .then((e) => (e ? "failed" : "complete"))
      .catch(() => "failed");
  });
  let stage = "isolated_seed";
  try {
    const submitted = await context.request.post("/api/alpha", {
      data: {
        action: "submit",
        request: randomUUID(),
        finding: null,
        previous: null,
        category: "Traders",
        type: "prediction",
        visibility: "members",
        claim,
        purpose:
          "Isolated short-horizon workflow check, not a real prediction.",
        subject: "ETH",
        chain: "",
        contract: "",
        details: explicitUnknownContext("Traders"),
        evidence: [
          {
            kind: "link",
            value:
              "https://docs.cdp.coinbase.com/api-reference/exchange-api/rest-api/products/get-product-ticker",
            label: "Ticker documentation",
          },
        ],
        addition:
          "Documented the limits of a spot snapshot in a synthetic scenario.",
        limitations:
          "No return, price outcome or successful prediction is claimed.",
        firstNoticed: null,
        horizon,
        checkCondition:
          "A current spot quote cannot establish historical performance; independent comparison remains inconclusive.",
        sourceMessage: null,
        sourceRevision: null,
        relatedVersion: null,
        correction: null,
      },
    });
    expect(submitted.ok()).toBe(true);
    const { version } = (await submitted.json()) as { version: string };
    stage = "profile_navigation";
    await page.goto("/");
    await page
      .locator(".topbar")
      .getByRole("link", { name: "My profile" })
      .click();
    await expect(
      page.getByRole("heading", { name: "Your NFT progression" }),
    ).toBeVisible({ timeout: 30000 });
    await page.getByText(/^Traders: \d+ shown$/).click();
    stage = "category_history";
    await page
      .locator("details")
      .filter({ has: page.getByText(/^Traders: \d+ shown$/) })
      .getByRole("link", { name: claim, exact: true })
      .click();
    await expect(
      page.getByText("Outcome pending.", { exact: false }),
    ).toBeVisible({ timeout: 20000 });
    stage = "due_check";
    // The workstation clock can differ from the database's authoritative clock.
    await expect
      .poll(
        async () => {
          const response = await context.request.get("/api/research");
          expect(response.ok()).toBe(true);
          const snapshot = (await response.json()) as ResearchData;
          return Date.parse(snapshot.serverTime!) >= Date.parse(horizon);
        },
        { timeout: 90000, intervals: [5000] },
      )
      .toBe(true);
    await page.reload();
    await page
      .getByRole("button", { name: "Check due outcome", exact: true })
      .click();
    await expect
      .poll(
        async () => {
          const r = await context.request.get("/api/research");
          expect(r.ok()).toBe(true);
          return ((await r.json()) as ResearchData).outcomes?.find(
            (o) => o.version_id === version,
          )?.status;
        },
        { timeout: 30000 },
      )
      .toBe("inconclusive");
    await page.reload();
    await expect(
      page.getByText("Latest observation: inconclusive.", { exact: true }),
    ).toBeVisible({ timeout: 20000 });
    const result = await context.request.get("/api/research");
    const snapshot = (await result.json()) as ResearchData;
    expect(snapshot.awards.reduce((n, a) => n + a.xp, 0)).toBe(
      data.awards.reduce((n, a) => n + a.xp, 0),
    );
    expect(snapshot.versions.find((v) => v.id === version)?.claim).toBe(claim);
    stage = "independent_outcome_entry";
    const reviewer = await rankFixture(
      browser,
      baseURL!,
      info.project.use,
      false,
      "risk",
    );
    reviewerContext = reviewer.context;
    expect(reviewer.data.outcomeReviewable).toContain(version);
    const reviewerPage = await reviewer.context.newPage();
    await reviewerPage.goto("/review");
    await reviewerPage
      .locator("#due-outcomes")
      .getByRole("link", { name: claim, exact: true })
      .click();
    const outcome = reviewerPage.locator(`#outcome-${version}`);
    await outcome
      .getByText("Record independent outcome", { exact: true })
      .click();
    const beforeEntry = (await (
      await reviewer.context.request.get("/api/research")
    ).json()) as ResearchData;
    await outcome
      .getByLabel("Observation date (UTC)", { exact: true })
      .fill(beforeEntry.serverTime!.slice(0, 19));
    await outcome
      .getByLabel("Observed facts", { exact: true })
      .fill(
        "Isolated workflow observation: source availability does not establish the synthetic forecast's result.",
      );
    await outcome
      .getByLabel("Compare with the original claim, horizon and criteria")
      .fill(
        "The original criterion requires independent historical comparison. Retrieved sources do not settle that condition; result remains inconclusive.",
      );
    await outcome
      .getByLabel("Uncertainty and competing explanations")
      .fill(
        "Synthetic scenario; no genuine market prediction or return is asserted.",
      );
    await outcome
      .getByLabel("Dated supporting sources (HTTPS, one per line)")
      .fill(
        "https://docs.cdp.coinbase.com/api-reference/exchange-api/rest-api/products/get-product-candles.md",
      );
    await outcome
      .getByLabel("Conflicts and scope limits")
      .fill("None within the existing isolated reviewer scope");
    await outcome.getByRole("checkbox").check();
    await outcome
      .getByRole("button", { name: "Record outcome", exact: true })
      .click();
    await expect(
      outcome.getByText(
        "Outcome recorded. This does not approve work or award XP.",
        { exact: true },
      ),
    ).toBeVisible({ timeout: 30000 });
    const final = (await (
      await context.request.get("/api/research")
    ).json()) as ResearchData;
    expect(
      final.outcomeAssessments?.filter((o) => o.version_id === version),
    ).toHaveLength(1);
    expect(
      final.outcomeAssessments?.find((o) => o.version_id === version),
    ).toMatchObject({
      status: "inconclusive",
      relation: "unknown",
      actor_id: reviewer.fixture.member,
    });
    await page.reload();
    const dir = `docs/evaluation-foundation/${info.project.name}`;
    await mkdir(dir, { recursive: true });
    await page.screenshot({ path: `${dir}/due-outcome.png`, fullPage: true });
    await page
      .locator(".topbar")
      .getByRole("link", { name: "My profile" })
      .click();
    await expect(
      page.getByRole("link", { name: /Later outcome recorded/ }).first(),
    ).toBeVisible({ timeout: 30000 });
    await page
      .getByRole("combobox", { name: "Record filter", exact: true })
      .selectOption("observed");
    await page.getByText(/^Traders: \d+ shown$/).click();
    await expect(
      page
        .locator("#category-history")
        .getByRole("link", { name: claim, exact: true }),
    ).toBeVisible();
    await page.screenshot({
      path: `${dir}/outcome-profile-history.png`,
      fullPage: true,
    });
  } catch (error) {
    await page
      .screenshot({ path: info.outputPath("isolated-outcome-failure.png") })
      .catch(() => undefined);
    await writeFile(
      info.outputPath("sanitized-outcome-failure.json"),
      JSON.stringify({
        stage,
        finalURL: new URL(page.url()).pathname,
        responses: responses.slice(-8),
        classification:
          error instanceof Error &&
          error.message.includes("strict mode violation")
            ? "ambiguous_locator"
            : "assertion_or_request_failure",
      }),
    );
    throw new Error(
      `Isolated outcome check failed at ${stage}; no request headers recorded`,
    );
  } finally {
    await context.close();
    await reviewerContext?.close();
  }
});
