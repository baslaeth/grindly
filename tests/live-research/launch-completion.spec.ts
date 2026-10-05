import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { rankFixture } from "./rank-fixture";
import { fillAssessment } from "./evaluation-helpers";
import { launchFields, type LaunchCategory } from "../../src/launch/forms";
import type { ResearchData } from "../../src/research/model";
import { assessmentFields, checklistVersion } from "../../src/alpha/checklists";

const official =
  "https://docs.cdp.coinbase.com/api-reference/exchange-api/rest-api/products/get-product-candles";
const contexts: Partial<Record<LaunchCategory, Record<string, string>>> = {
  "Whitelist Hunters": {
    project: "Sample Cedar access",
    official,
    eligibility:
      "Members who complete the published form; no real access promised",
    action: "Read the sample requirements; do not send a real application",
    cost: "No fee in this controlled case",
    deadline: "2026-11-10T12:00",
    routeEvidence:
      "Official API document is a reference only, not evidence of Cedar access",
  },
  "Airdrop Hunters": {
    project: "Sample Harbor route",
    network: "Base",
    status: "Speculative",
    testedSteps:
      "Read the official documentation; no wallet transaction claimed",
    costs: "Network fees unknown; no lockup tested",
    eligibility: "Unknown",
    checkpoint: "2026-11-10T12:00",
  },
  "Presale Hunters": {
    official,
    terms:
      "Sample terms only; the linked API document is not a sale announcement",
    eligibility: "No verified sale eligibility",
    deadline: "2026-11-10T12:00",
    valuation: "Unknown",
    vesting: "Unknown",
    productEvidence: "A published technical reference, not team diligence",
    downside: "Unverified sale and unavailable liquidity",
  },
  Degens: {
    chain: "Solana mainnet-beta",
    identifier: "So11111111111111111111111111111111111111112",
    catalyst: "Controlled risk warning, not a new catalyst claim",
    disclosure: "No position, payment or insider access",
  },
  "Seed and Early Stage Investors": {
    opportunity: "Sample Fern research",
    access: "Public reading only; no allocation",
    stage: "Pre-product sample",
    terms: "Unknown",
    lockup: "Unknown",
    teamProduct: "No independent team verification",
    invalidation: "Official claims cannot be corroborated",
    milestone: "Publish independent product evidence",
    reviewDate: "2026-11-10T12:00",
  },
  "NFT Specialists": {
    collection: "Sample Slate",
    network: "Ethereum",
    official: "Unknown",
    cost: "Unknown",
    eligibility: "Unknown",
    supply: "1000 in the fictional scenario only",
    utility: "No independently verified rights",
    liquidity: "No accessible liquidity established",
    catalyst: "A hypothetical mint guide",
    downside: "Unverified contract and rights",
    deadline: "2026-11-10T12:00",
  },
  "Meta Catchers": {
    theme: "Source-grounded monitoring",
    projects: "Public API documentation tools",
    earlyEvidence: "Dated API specification and bounded live observations",
    whyNow:
      "Distinguish retrieved facts from predictions before making decisions",
    target: "Unknown",
    invalidation: "No independently dated examples",
    horizon: "2026-11-10T12:00",
  },
};

test("launch: shared daily limit rejects a new request without creating a record", async ({
  browser,
  baseURL,
}, info) => {
  test.skip(
    info.project.name !== "desktop",
    "One isolated server-boundary check",
  );
  test.setTimeout(120000);
  const author = await rankFixture(browser, baseURL!, info.project.use);
  try {
    expect(author.data.launchAllowance?.dailyRemaining).toBe(0);
    const original = author.data.versions.find((v) =>
      v.claim.startsWith("Controlled launch walkthrough: Whitelist Hunters."),
    );
    expect(original).toBeDefined();
    const db = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SECRET_KEY!,
      { auth: { persistSession: false } },
    );
    const prior = await db
      .from("alpha_requests")
      .select("payload")
      .eq("version_id", original!.id)
      .eq("member_id", author.fixture.member)
      .single();
    expect(prior.error).toBeNull();
    const response = await author.context.request.post("/api/alpha", {
      data: {
        ...prior.data!.payload,
        action: "submit",
        request: crypto.randomUUID(),
      },
    });
    expect(response.ok()).toBe(false);
    expect(response.status()).toBe(409);
    expect((await response.json()).error.code).toBe("DAILY_ALPHA_LIMIT");
    const after = (await (
      await author.context.request.get("/api/research")
    ).json()) as ResearchData;
    expect(after.findings.map((f) => f.id).sort()).toEqual(
      author.data.findings.map((f) => f.id).sort(),
    );
    expect(after.launchAllowance?.dailyRemaining).toBe(0);
  } finally {
    await author.context.close();
  }
});

test("launch: seven remaining realistic forms, safe retry, sharing and reload", async ({
  browser,
  baseURL,
}, info) => {
  test.skip(
    info.project.name !== "desktop",
    "Saves once; mobile uses the same persisted records",
  );
  test.setTimeout(600000);
  const dir = "docs/launch-completion";
  await mkdir(dir, { recursive: true });
  const sessions: Awaited<ReturnType<typeof rankFixture>>[] = [];
  let stage = "login";
  try {
    for (const specialty of ["project", "risk", "operations"] as const)
      sessions.push(
        await rankFixture(
          browser,
          baseURL!,
          info.project.use,
          false,
          specialty,
        ),
      );
    const snapshot = async (index: number) =>
      (await (
        await sessions[index]!.context.request.get("/api/research")
      ).json()) as ResearchData;
    const results = [];
    for (const [index, categories] of [
      [0, ["Whitelist Hunters"]],
      [1, ["Airdrop Hunters", "Presale Hunters", "Degens"]],
      [
        2,
        ["Seed and Early Stage Investors", "NFT Specialists", "Meta Catchers"],
      ],
    ] as const) {
      const page = await sessions[index]!.context.newPage();
      for (const category of categories) {
        stage = category;
        const claim = `Controlled launch walkthrough: ${category}. Check published requirements and uncertainty before acting; no real campaign or successful future outcome is claimed.`;
        const existing = (await snapshot(index)).versions.find(
          (v) => v.claim === claim,
        );
        if (existing) {
          const db = createClient(
            process.env.SUPABASE_URL!,
            process.env.SUPABASE_SECRET_KEY!,
            { auth: { persistSession: false } },
          );
          const prior = await db
            .from("alpha_requests")
            .select("request_id,payload")
            .eq("version_id", existing.id)
            .eq("member_id", sessions[index]!.fixture.member)
            .single();
          expect(prior.error).toBeNull();
          const replay = await sessions[index]!.context.request.post(
            "/api/alpha",
            {
              data: {
                ...prior.data!.payload,
                action: "submit",
                request: prior.data!.request_id,
              },
            },
          );
          expect(replay.ok()).toBe(true);
          expect((await replay.json()).id).toBe(existing.finding_id);
          await page.goto(
            `/findings/${existing.finding_id}?saved=${existing.id}`,
          );
          await expect(page.getByText(/^Alpha saved:/)).toBeVisible({
            timeout: 30000,
          });
          await page.reload();
          await expect(
            page.getByRole("heading", { name: claim, exact: true }),
          ).toBeVisible({ timeout: 30000 });
          expect(
            (await snapshot((index + 1) % 3)).findings.some(
              (f) => f.id === existing.finding_id,
            ),
          ).toBe(true);
          await page.screenshot({
            path: `${dir}/form-${category.toLowerCase().replaceAll(" ", "-")}-receipt.png`,
          });
          results.push({
            category,
            id: existing.finding_id,
            resumed: true,
            replaySameId: true,
            reloaded: true,
          });
          continue;
        }
        await page.goto("/findings/new");
        await page
          .getByLabel("Contribution category", { exact: true })
          .selectOption(category);
        await page
          .getByLabel("Contribution type", { exact: true })
          .selectOption(category === "Degens" ? "warning" : "guide");
        await page
          .getByLabel("Subject or project *", { exact: true })
          .fill(`Sample ${category}`);
        await page
          .getByText("Additional category details", { exact: true })
          .click();
        for (const field of launchFields[category].filter(
          (f) => !f.fromPrediction,
        )) {
          stage = `${category}:${field.key}`;
          const value = contexts[category]![field.key] ?? "Unknown";
          if (value === "Unknown")
            await page
              .getByLabel(`${field.label} answer`, { exact: true })
              .selectOption("unknown");
          else {
            await page
              .getByLabel(`${field.label} answer`, { exact: true })
              .selectOption("details");
            if (field.options)
              await page
                .getByLabel(`${field.label} *`, { exact: true })
                .selectOption(value);
            else
              await page
                .getByLabel(`${field.label} *`, { exact: true })
                .fill(value);
          }
        }
        await page
          .getByLabel("Useful action or claim *", { exact: true })
          .fill(claim);
        await page
          .getByLabel("Cost or main risk *", { exact: true })
          .fill(
            "Controlled sample: public documents do not prove sample eligibility, rewards or safety. Do not act on fictional terms.",
          );
        await page
          .getByLabel("Why does it matter to members? *", { exact: true })
          .fill(
            "Shows how to record usable steps separately from unknown facts and later outcomes.",
          );
        await page
          .getByLabel("Links or transaction hashes (one per line)", {
            exact: true,
          })
          .fill(
            category === "Whitelist Hunters"
              ? "https://example.test/unavailable-controlled-source"
              : official,
          );
        await page
          .getByLabel("What did you personally discover, test, or add? *", {
            exact: true,
          })
          .fill(
            "Organized the category-specific checks and documented missing evidence. This is isolated walkthrough content, not a genuine opportunity.",
          );
        await page
          .getByRole("checkbox", {
            name: "I have permission to share this evidence and have identified my own contribution.",
          })
          .check();
        if (category === "Whitelist Hunters") {
          await page.route("**/api/alpha", async (route) => {
            if (route.request().postDataJSON()?.action === "submit") {
              await route.fulfill({
                status: 503,
                contentType: "application/json",
                body: JSON.stringify({
                  error: {
                    message:
                      "Controlled failed-send test. Your input is retained.",
                  },
                }),
              });
              await page.unroute("**/api/alpha");
            } else await route.continue();
          });
          await page
            .getByRole("button", { name: "Submit for review", exact: true })
            .click();
          await expect(
            page
              .getByRole("alert")
              .filter({ hasText: "Controlled failed-send" }),
          ).toBeVisible();
          await expect(
            page.getByLabel("Useful action or claim *", { exact: true }),
          ).toHaveValue(claim);
        }
        stage = `${category}:save`;
        const request = page.waitForRequest(
          (r) =>
            r.url().endsWith("/api/alpha") &&
            r.postDataJSON()?.action === "submit",
          { timeout: 20000 },
        );
        await page
          .getByRole("button", { name: "Submit for review", exact: true })
          .click();
        const payload = (
          await request.catch(async () => {
            throw new Error(
              `Submission not sent: ${(await page.getByRole("alert").allTextContents()).join(" ")}; invalid fields: ${(await page.locator("input:invalid,textarea:invalid,select:invalid").evaluateAll((els) => els.map((e) => e.getAttribute("name")))).join(",")}`,
            );
          })
        ).postDataJSON();
        await expect(page.getByText(/^Alpha saved:/)).toBeVisible({
          timeout: 45000,
        });
        const id = new URL(page.url()).pathname.split("/").at(-1)!;
        const repeat = await sessions[index]!.context.request.post(
          "/api/alpha",
          { data: payload },
        );
        expect(repeat.ok(), "Same request retries safely").toBe(true);
        expect((await repeat.json()).id).toBe(id);
        await page.reload();
        await expect(
          page.getByRole("heading", { name: claim, exact: true }),
        ).toBeVisible();
        expect(
          (await snapshot((index + 1) % 3)).findings.some((f) => f.id === id),
        ).toBe(true);
        expect(
          (await snapshot(index)).versions.filter((v) => v.finding_id === id),
        ).toHaveLength(1);
        await page.screenshot({
          path: `${dir}/form-${category.toLowerCase().replaceAll(" ", "-")}-receipt.png`,
          fullPage: false,
        });
        results.push({
          category,
          id,
          saved: true,
          replaySameId: true,
          reloaded: true,
        });
      }
      await page.close();
    }
    await writeFile(
      `${dir}/category-browser-results.json`,
      JSON.stringify({ isolated: true, results }, null, 2),
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message.split("\n").slice(0, 4).join(" ")
        : "Assertion";
    throw new Error(
      `Isolated launch form walkthrough failed at ${stage}: ${message.slice(0, 500)}`,
    );
  } finally {
    for (const session of sessions) await session.context.close();
  }
});

test("launch: isolated reviewer appointment, confirmed monitoring event and acknowledgment", async ({
  browser,
  baseURL,
}, info) => {
  test.skip(
    info.project.name !== "desktop",
    "One confirmation; responsive captures reuse the notification",
  );
  const operator = await rankFixture(
    browser,
    baseURL!,
    info.project.use,
    false,
    "operations",
  );
  const author = await rankFixture(browser, baseURL!, info.project.use);
  const page = await operator.context.newPage();
  let stage = "appointment";
  try {
    await page.goto("/review");
    const appointments = page.getByRole("region", {
      name: "Reviewer appointments",
    });
    const candidate = operator.data.profiles.find(
      (p) => p.display_name === "DEMO QA risk",
    )!;
    expect(candidate.is_demo).toBe(true);
    await appointments
      .getByLabel("Member", { exact: true })
      .selectOption(candidate.member_id);
    await appointments
      .getByLabel("Category", { exact: true })
      .selectOption("Traders");
    await appointments
      .getByLabel("Explicit review scope")
      .fill("Isolated launch walkthrough evidence review only");
    await appointments
      .getByRole("button", { name: "Save reviewer scope" })
      .click();
    await expect(appointments.getByRole("status")).toHaveText(
      "Reviewer scope updated and pending work rechecked.",
      { timeout: 30000 },
    );
    stage = "confirm";
    const marker = JSON.parse(
      await readFile(".local/controlled-monitor-event.json", "utf8"),
    );
    const ownSnapshot = async () =>
      (await (
        await author.context.request.get("/api/research")
      ).json()) as ResearchData;
    const operatorSnapshot = (await (
      await operator.context.request.get("/api/research")
    ).json()) as ResearchData;
    if (
      operatorSnapshot.monitorQueue?.some((event) => event.id === marker.event)
    ) {
      const row = page
        .getByRole("region", { name: "Opportunity monitoring" })
        .locator("article")
        .filter({ hasText: "Coinbase Exchange candle coverage" });
      await row.getByLabel("Decision", { exact: true }).selectOption("confirm");
      await row
        .getByLabel("What changed", { exact: true })
        .fill(
          "Controlled walkthrough event: notification route tested. No real Coinbase document change is claimed.",
        );
      await row
        .getByLabel("Required action", { exact: true })
        .fill(
          "Open the saved source check and acknowledge this controlled notification; no trade or application is required.",
        );
      await row
        .getByRole("button", { name: "Record decision", exact: true })
        .click();
      await expect
        .poll(
          async () =>
            (await ownSnapshot()).notifications?.some((n) =>
              n.detail.includes("Controlled walkthrough event"),
            ),
          { timeout: 30000 },
        )
        .toBe(true);
    }
    stage = "notification";
    const memberPage = await author.context.newPage();
    await memberPage.goto("/membership");
    const watch = memberPage.getByRole("region", { name: "Your watchlist" });
    await expect(watch).toContainText("Last successful check:");
    const notification = watch
      .locator("article")
      .filter({
        has: memberPage.getByRole("button", {
          name: "Acknowledge",
          exact: true,
        }),
      })
      .filter({ hasText: "Controlled walkthrough event" });
    if (await notification.count()) {
      await notification.scrollIntoViewIfNeeded();
      await memberPage.screenshot({
        path: "docs/launch-completion/notification-desktop.png",
      });
      await notification
        .getByRole("button", { name: "Acknowledge", exact: true })
        .click();
    }
    await expect
      .poll(
        async () =>
          (await ownSnapshot()).notifications?.find((n) =>
            n.detail.includes("Controlled walkthrough event"),
          )?.status,
        { timeout: 30000 },
      )
      .toBe("acknowledged");
    await memberPage.reload();
    await watch.scrollIntoViewIfNeeded();
    await memberPage.screenshot({
      path: "docs/launch-completion/watchlist-desktop.png",
    });
    await memberPage.setViewportSize({ width: 390, height: 844 });
    await watch.scrollIntoViewIfNeeded();
    await memberPage.screenshot({
      path: "docs/launch-completion/watchlist-mobile.png",
    });
    const acknowledged = watch
      .locator("article")
      .filter({ hasText: "acknowledged" })
      .filter({ hasText: "Controlled walkthrough event" });
    await acknowledged.scrollIntoViewIfNeeded();
    await memberPage.screenshot({
      path: "docs/launch-completion/notification-mobile.png",
    });
    expect(
      await memberPage.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  } catch (error) {
    throw new Error(
      `Isolated monitor walkthrough at ${stage}: ${error instanceof Error ? error.message.slice(0, 500) : "assertion"}`,
    );
  } finally {
    await operator.context.close();
    await author.context.close();
  }
});

test("launch: independent work review, no posting award and matching history", async ({
  browser,
  baseURL,
}, info) => {
  test.skip(
    info.project.name !== "desktop",
    "Independent award runs once; mobile reuses saved history",
  );
  const author = await rankFixture(browser, baseURL!, info.project.use);
  const reviewer = await rankFixture(
    browser,
    baseURL!,
    info.project.use,
    false,
    "risk",
  );
  const page = await reviewer.context.newPage();
  let stage = "lookup";
  try {
    const marker = JSON.parse(
      await readFile(".local/analysis-walkthrough.json", "utf8"),
    );
    const snapshot = async () =>
      (await (
        await author.context.request.get("/api/research")
      ).json()) as ResearchData;
    let data = await snapshot();
    const version = data.versions.find((v) => v.id === marker.version)!;
    expect(version).toBeDefined();
    const btc = data.alphas!.find(
      (a) =>
        a.subject === "BTC" &&
        data.launchTerms?.some((t) => t.version_id === a.version_id),
    )!;
    expect(
      data.launchXp?.filter(
        (e) => e.version_id === btc.version_id && e.kind === "work",
      ),
    ).toHaveLength(0);
    const assignment = data.assignments.find(
      (a) => a.version_id === version.id,
    )!;
    const ownAttempt = await author.context.request.post("/api/alpha", {
      data: {
        action: "review",
        version: version.id,
        assignment: assignment.id,
        checklist: checklistVersion,
        decision: "accept",
        reason: "Controlled self-approval must be denied",
        conflicts: "Author",
        conflictFree: true,
        workClass: "tested",
        assessment: Object.fromEntries(
          assessmentFields.map((f) => [
            f.key,
            "Controlled independent-review boundary test",
          ]),
        ),
      },
    });
    expect(ownAttempt.ok()).toBe(false);
    if (!data.launchXp?.some((e) => e.version_id === version.id)) {
      stage = "independent_review";
      await page.goto("/review");
      const form = page.locator("article.record").filter({
        has: page.getByRole("heading", {
          name: `${version.claim} (v${version.version})`,
          exact: true,
        }),
      });
      await fillAssessment(form);
      await form
        .getByLabel("Verified work classification", { exact: true })
        .selectOption("tested");
      await form.getByLabel("Decision", { exact: true }).selectOption("accept");
      await form
        .getByLabel("Reasons and scope limits")
        .fill(
          "Controlled independent review: the official Coinbase candle document supports bounded requests and missing-history caution. Focused useful verification work earns 150 test XP; the November availability prediction is not settled or verified by this decision.",
        );
      await form
        .getByLabel("Conflicts disclosure")
        .fill(
          "Separate isolated reviewer, not the author; no genuine award or customer activity.",
        );
      await form.getByRole("checkbox").check();
      const request = page.waitForRequest(
        (r) =>
          r.url().endsWith("/api/alpha") &&
          r.postDataJSON()?.action === "review",
      );
      await form
        .getByRole("button", { name: "Record decision", exact: true })
        .click();
      const payload = (await request).postDataJSON();
      await expect
        .poll(
          async () =>
            (await snapshot()).launchXp
              ?.filter((e) => e.version_id === version.id)
              .reduce((n, e) => n + e.xp, 0),
          { timeout: 30000 },
        )
        .toBe(150);
      await reviewer.context.request.post("/api/alpha", { data: payload });
    }
    stage = "history";
    data = await snapshot();
    expect(
      data.launchXp?.filter((e) => e.version_id === version.id),
    ).toHaveLength(1);
    expect(
      data.launchSettlements?.some((e) => e.version_id === version.id),
    ).toBe(false);
    const memberPage = await author.context.newPage();
    await memberPage.goto("/membership");
    await expect(
      memberPage.getByRole("heading", {
        name: "Your NFT progression",
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      memberPage.getByText("150 XP awarded", { exact: true }),
    ).toBeVisible();
    await memberPage
      .getByRole("heading", { name: "Your NFT progression", exact: true })
      .scrollIntoViewIfNeeded();
    await memberPage.screenshot({
      path: "docs/launch-completion/profile-progression-desktop.png",
    });
    await memberPage.goto(marker.url);
    await expect(memberPage.getByText(/Outcome pending/)).toBeVisible();
    await memberPage.screenshot({
      path: "docs/launch-completion/analysis-work-xp-desktop.png",
    });
  } catch (error) {
    await writeFile(
      info.outputPath("safe-review-state.json"),
      JSON.stringify({
        stage,
        alerts: await page.locator("main [role=alert]").allTextContents(),
        invalid: await page
          .locator(
            "main input:invalid, main textarea:invalid, main select:invalid",
          )
          .evaluateAll((els) => els.map((e) => e.getAttribute("name"))),
      }),
    );
    const message =
      error instanceof Error
        ? error.message.split("\n").slice(0, 4).join(" ")
        : "Assertion";
    throw new Error(
      `Isolated work-review walkthrough failed at ${stage}: ${message.slice(0, 500)}`,
    );
  } finally {
    await author.context.close();
    await reviewer.context.close();
  }
});

test("launch: rejection, appeal, correction after daily limit and honest later observation", async ({
  browser,
  baseURL,
}, info) => {
  test.skip(
    info.project.name !== "desktop",
    "Controlled chronology saved once",
  );
  const author = await rankFixture(browser, baseURL!, info.project.use);
  const reviewer = await rankFixture(
    browser,
    baseURL!,
    info.project.use,
    false,
    "risk",
  );
  const page = await author.context.newPage();
  const reviewPage = await reviewer.context.newPage();
  let stage = "lookup";
  try {
    const snapshot = async () =>
      (await (
        await author.context.request.get("/api/research")
      ).json()) as ResearchData;
    let data = await snapshot();
    const original = data.versions.find((v) =>
      v.claim.startsWith("Controlled launch walkthrough: Whitelist Hunters."),
    )!;
    expect(original).toBeDefined();
    const analysisMarker = JSON.parse(
      await readFile(".local/analysis-walkthrough.json", "utf8"),
    );
    const correctionOriginal = data.versions.find(
      (v) => v.id === analysisMarker.version,
    )!;
    const correctedClaim =
      "Controlled clarification: Coinbase documents bounded candle requests and possible gaps. Documentation is not proof of future endpoint availability; the original November check remains Pending.";
    const existing = data.versions.find(
      (v) =>
        v.finding_id === correctionOriginal.finding_id &&
        v.claim === correctedClaim,
    );
    if (!existing) {
      stage = "reject";
      if (
        !data.decisions.some(
          (d) => d.version_id === original.id && d.decision === "reject",
        )
      ) {
        await reviewPage.goto("/review");
        const form = reviewPage.locator("article.record").filter({
          has: reviewPage.getByRole("heading", {
            name: `${original.claim} (v${original.version})`,
            exact: true,
          }),
        });
        await fillAssessment(form);
        await form
          .getByLabel("Verified work classification", { exact: true })
          .selectOption("none");
        await form
          .getByLabel("Decision", { exact: true })
          .selectOption("reject");
        await form
          .getByLabel("Reasons and scope limits")
          .fill(
            "Controlled independent rejection: neither the unavailable link nor unrelated API documentation verifies a Cedar access route. No work XP is justified.",
          );
        await form
          .getByLabel("Conflicts disclosure")
          .fill(
            "Separate isolated reviewer; no genuine research or opportunity.",
          );
        await form.getByRole("checkbox").check();
        await form
          .getByRole("button", { name: "Record decision", exact: true })
          .click();
        await expect
          .poll(
            async () =>
              (await snapshot()).findings.find(
                (f) => f.id === original.finding_id,
              )?.status,
            { timeout: 30000 },
          )
          .toBe("rejected");
      }
      stage = "appeal";
      await page.goto(`/findings/${original.finding_id}`);
      data = await snapshot();
      if (!data.disputes.some((d) => d.version_id === original.id)) {
        await page
          .getByText("Request an independent appeal", { exact: true })
          .click();
        await page
          .getByLabel("Reason for independent appeal")
          .fill(
            "Controlled appeal asks a different reviewer to assess the bounded source interpretation; it does not assert verified access or request automatic XP.",
          );
        await page
          .getByRole("button", {
            name: "Request independent review",
            exact: true,
          })
          .click();
        await expect
          .poll(
            async () =>
              (await snapshot()).findings.find(
                (f) => f.id === original.finding_id,
              )?.status,
            { timeout: 30000 },
          )
          .toBe("disputed");
      }
      stage = "correction";
      await expect(
        page.getByRole("link", { name: "Submit a correction", exact: true }),
      ).toHaveCount(0);
      await page.goto(`/findings/${correctionOriginal.finding_id}`);
      await page
        .getByRole("link", { name: "Submit a correction", exact: true })
        .click();
      await expect(
        page.getByLabel("Useful action or claim *", { exact: true }),
      ).toBeVisible({ timeout: 30000 });
      await page
        .getByLabel("What this correction changes", { exact: false })
        .fill(
          "Clarify documentation versus future observed availability; preserve original terms, date and review. This self-correction earns no correction reward.",
        );
      await page
        .getByLabel("Useful action or claim *", { exact: true })
        .fill(correctedClaim);
      await page
        .getByRole("checkbox", {
          name: "I have permission to share this evidence and have identified my own contribution.",
        })
        .check();
      const request = page.waitForRequest(
        (r) =>
          r.url().endsWith("/api/alpha") &&
          r.postDataJSON()?.action === "submit",
        { timeout: 20000 },
      );
      await page
        .getByRole("button", { name: "Submit corrected version", exact: true })
        .click();
      const payload = (await request).postDataJSON();
      await expect(page.getByText(/^Alpha saved:/)).toBeVisible({
        timeout: 30000,
      });
      const replay = await author.context.request.post("/api/alpha", {
        data: payload,
      });
      expect(replay.ok()).toBe(true);
    }
    data = await snapshot();
    const current = data.versions.find(
      (v) =>
        v.finding_id === correctionOriginal.finding_id &&
        v.claim === correctedClaim,
    )!;
    expect(data.versions.find((v) => v.id === original.id)?.submitted_at).toBe(
      original.submitted_at,
    );
    expect(data.launchAllowance?.dailyRemaining).toBe(0);
    expect(data.alphas?.find((a) => a.version_id === current.id)?.horizon).toBe(
      data.alphas?.find((a) => a.version_id === correctionOriginal.id)?.horizon,
    );
    expect(
      data.launchXp
        ?.filter((e) => e.finding_id === correctionOriginal.finding_id)
        .reduce((n, e) => n + e.xp, 0),
    ).toBe(150);
    stage = "mature";
    const matured = data.versions.find(
      (v) =>
        v.claim.startsWith("Isolated timed fixture") &&
        data.findings.some(
          (f) => f.id === v.finding_id && f.author_id === author.fixture.member,
        ) &&
        data.alphas?.some(
          (a) =>
            a.version_id === v.id &&
            a.horizon &&
            Date.parse(a.horizon) < Date.parse(data.serverTime!),
        ),
    )!;
    expect(matured).toBeDefined();
    const outcomeFacts =
      "Controlled launch checkpoint observation: this earlier isolated fixture is genuinely past its saved horizon. No complete historical path establishes its claimed outcome; no successful market prediction is asserted.";
    stage = "outcome";
    if (
      !data.outcomeAssessments?.some(
        (o) => o.version_id === matured.id && o.facts === outcomeFacts,
      )
    ) {
      await reviewPage.goto(`/findings/${matured.finding_id}`);
      const outcome = reviewPage.locator(`#outcome-${matured.id}`);
      await outcome
        .getByText("Record independent outcome", { exact: true })
        .click();
      await outcome
        .getByLabel("Observation date (UTC)", { exact: true })
        .fill((await snapshot()).serverTime!.slice(0, 19));
      await outcome
        .getByLabel("Observed facts", { exact: true })
        .fill(outcomeFacts);
      await outcome
        .getByLabel("Compare with the original claim, horizon and criteria")
        .fill(
          "The original controlled fixture explicitly warned that a current quote cannot establish historical performance. No complete ordered evidence was supplied, so this remains inconclusive, not successful or failed.",
        );
      await outcome
        .getByLabel("Uncertainty and competing explanations")
        .fill(
          "Incomplete historical coverage; neither success nor failure can be inferred from a current source.",
        );
      await outcome
        .getByLabel("Dated supporting sources (HTTPS, one per line)")
        .fill(official);
      await outcome
        .getByLabel("Conflicts and scope limits")
        .fill(
          "Independent isolated reviewer; official API documentation is a coverage reference, not proof of this forecast.",
        );
      await outcome.getByRole("checkbox").check();
      await outcome
        .getByRole("button", { name: "Record outcome", exact: true })
        .click();
      await expect
        .poll(
          async () =>
            (await snapshot()).outcomeAssessments?.some(
              (o) =>
                o.version_id === matured.id &&
                o.facts === outcomeFacts &&
                o.status === "inconclusive",
            ),
          { timeout: 30000 },
        )
        .toBe(true);
    }
    data = await snapshot();
    expect(
      data.launchXp?.filter((e) => e.finding_id === original.finding_id),
    ).toHaveLength(0);
    await page.goto(`/findings/${matured.finding_id}`);
    await page.locator(`#outcome-${matured.id}`).scrollIntoViewIfNeeded();
    await page.screenshot({
      path: "docs/launch-completion/controlled-outcome-desktop.png",
    });
  } catch (error) {
    throw new Error(
      `Controlled chronology at ${stage}: ${error instanceof Error ? error.message.slice(0, 600) : "assertion"}`,
    );
  } finally {
    await author.context.close();
    await reviewer.context.close();
  }
});
