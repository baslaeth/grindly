import { test, expect as baseExpect, type Page } from "@playwright/test";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { rankFixture } from "./rank-fixture";
import { alphaCategories, alphaSubmission } from "../../src/alpha/model";
import { credit, type ResearchData } from "../../src/research/model";
const expect = baseExpect.configure({ timeout: 60000 });
test.use({ actionTimeout: 60000, navigationTimeout: 90000 });
test.setTimeout(900000);

async function expand(page: Page) {
  for (const details of await page.locator("main details").all()) {
    if (
      (await details.isVisible()) &&
      (await details.getAttribute("open")) === null
    )
      await details.locator(":scope > summary").click();
  }
}
async function fit(page: Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBe(true);
}
async function prepare(page: Page, category: string, type = "find") {
  await page
    .getByRole("combobox", { name: "Contribution category", exact: true })
    .selectOption(category);
  await page
    .getByRole("combobox", { name: "Contribution type", exact: true })
    .selectOption(type);
  await expand(page);
  for (const answer of await page
    .locator('.category-field select[aria-label$=" answer"]')
    .all())
    await answer.selectOption("unknown");
  await page
    .locator('[name="subject"]')
    .fill("Sample pilot: Axis documentation checklist");
  if (category === "Airdrop Hunters") {
    await page
      .locator('[name="airdrop-official"]')
      .fill("https://docs.axisrobotics.ai/contributor-guide/sign-and-verify");
    await page
      .locator('[name="airdrop-confirmed"]')
      .fill(
        "The documentation describes signing completed submissions on Base. Points do not guarantee tokens or personal eligibility.",
      );
    await page
      .locator('[name="airdrop-steps"]')
      .fill(
        "Read the current task and official signing instructions. Check the Portfolio status before deciding whether to sign. This sample did not execute tasks or transactions.",
      );
  } else {
    await page
      .locator('[name="usefulAction"]')
      .fill(
        "Review the documented prerequisites before deciding whether to participate.",
      );
    await page
      .locator('[name="purpose"]')
      .fill(
        "Identify the unresolved requirements before spending time on participation.",
      );
  }
  await page
    .locator('[name="costOrRisk"]')
    .fill(
      "Time and possible network fees. Points do not guarantee rewards; personal eligibility is unknown.",
    );
  await page
    .locator('[name="addition"]')
    .fill(
      "Documentation-only checklist for the isolated pilot usability test. No wallet execution, eligibility or reward claimed.",
    );
  await page
    .locator('[name="evidence"]')
    .fill("https://docs.axisrobotics.ai/contributor-guide/sign-and-verify");
  await page.getByRole("checkbox", { name: "I have permission" }).check();
}

test("pilot pages, ten rooms, all categories and new-post types retain usable layouts and valid payloads", async ({
  browser,
  baseURL,
}, info) => {
  test.setTimeout(900000);
  const { context, data } = await rankFixture(
    browser,
    baseURL!,
    info.project.use,
    false,
    "operations",
  );
  const page = await context.newPage();
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await mkdir("docs/pilot-evidence", { recursive: true });
  try {
    for (const route of [
      "/",
      "/membership",
      "/following",
      "/review",
      "/xp",
      "/join",
    ]) {
      await page.goto(route);
      await expect(page.locator("main h1")).toBeVisible();
      await fit(page);
      if (["/", "/membership", "/following", "/review"].includes(route))
        await page.screenshot({
          path: `docs/pilot-evidence/${info.project.name}-${route === "/" ? "home" : route.slice(1)}.png`,
        });
    }
    for (const room of data.rooms ?? []) {
      await page.goto(`/workbench?room=${room.id}`);
      await expect(
        page.getByRole("tab", { name: "Alphas", exact: true }),
      ).toHaveAttribute("aria-selected", "true");
      for (const label of [
        "Chat",
        "Evidence brief",
        "Peer requests",
        "Members",
        "Alphas",
      ])
        await page.getByRole("tab", { name: label, exact: true }).click();
      await fit(page);
    }
    const reviewed = data.alphas?.find(
      (a) => a.subject === "Sample: Axis points signing and task limits",
    );
    expect(reviewed).toBeTruthy();
    const finding = data.versions.find(
      (v) => v.id === reviewed!.version_id,
    )!.finding_id;
    await page.goto(`/findings/${finding}`);
    await expect(
      page.getByRole("heading", { name: "Risks and unknowns", exact: true }),
    ).toBeVisible();
    await page.screenshot({
      path: `docs/pilot-evidence/${info.project.name}-alpha.png`,
    });
    await expand(page);
    await fit(page);
    await page.goto(`/intelligence?alpha=${finding}`);
    await expect(
      page.getByRole("navigation", { name: "Evidence stages" }),
    ).toBeVisible();
    if (!data.localAIEnabled)
      await expect(
        page.getByText("Fresh AI analysis is not connected", { exact: false }),
      ).toBeVisible();
    await page.screenshot({
      path: `docs/pilot-evidence/${info.project.name}-intelligence.png`,
    });
    await page
      .getByText("Claim-by-claim model evidence", { exact: true })
      .click();
    await fit(page);
    let payload: unknown;
    await page.route("**/api/alpha", async (route) => {
      payload = route.request().postDataJSON();
      await route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({
          error: {
            message: "Pilot test: save unavailable. Your input is retained.",
          },
        }),
      });
    });
    await page.goto("/findings/new");
    for (const category of alphaCategories) {
      await prepare(page, category);
      const options = await page
        .getByRole("combobox", { name: "Contribution type", exact: true })
        .locator("option")
        .allTextContents();
      expect(options).toEqual([
        "Finding or analysis",
        "Guide",
        "Warning",
        "Prediction",
      ]);
      await fit(page);
      payload = undefined;
      await page
        .getByRole("button", { name: "Submit for review", exact: true })
        .click();
      await expect(page.locator('main [role="alert"]')).toContainText(
        "Pilot test: save unavailable",
      );
      expect(alphaSubmission.safeParse(payload).success, category).toBe(true);
      await expect(page.locator('[name="subject"]')).toHaveValue(
        "Sample pilot: Axis documentation checklist",
      );
    }
    for (const type of ["guide", "warning", "prediction"]) {
      await prepare(page, "Project Analysts", type);
      payload = undefined;
      await page
        .getByRole("button", { name: "Submit for review", exact: true })
        .click();
      await expect(page.locator('main [role="alert"]')).toContainText(
        "Pilot test: save unavailable",
      );
      expect(alphaSubmission.safeParse(payload).success, type).toBe(true);
    }
    expect(errors).toEqual([]);
  } finally {
    await context.close();
  }
});

test("one isolated pilot alpha persists, follows and retains XP without AI or review mutations", async ({
  browser,
  baseURL,
}, info) => {
  test.skip(
    info.project.name !== "desktop",
    "One shared persistence exercise; mobile is read-only/payload coverage.",
  );
  const { context, data } = await rankFixture(
    browser,
    baseURL!,
    info.project.use,
    false,
    "operations",
  );
  const page = await context.newPage();
  const before = credit(data);
  const journal = ".local/pilot-journey.json";
  let record: { id: string; version: string } | undefined;
  try {
    record = JSON.parse(await readFile(journal, "utf8"));
  } catch {}
  try {
    if (!record) {
      expect(data.launchAllowance?.dailyRemaining).toBeGreaterThan(0);
      await page.goto("/findings/new");
      await prepare(page, "Airdrop Hunters", "guide");
      const saved = page.waitForResponse(
        (r) =>
          r.url().endsWith("/api/alpha") && r.request().method() === "POST",
      );
      await page
        .getByRole("button", { name: "Submit for review", exact: true })
        .click();
      const response = await saved;
      expect(response.ok()).toBe(true);
      record = await response.json();
      await writeFile(journal, JSON.stringify(record, null, 2));
    }
    await page.goto(`/findings/${record!.id}`);
    await expect(
      page.getByText("Pending review", { exact: true }).first(),
    ).toBeVisible();
    await expand(page);
    const follow = page.getByRole("button", { name: "Follow", exact: true });
    if (await follow.isVisible()) await follow.click();
    await expect(
      page.getByRole("button", { name: "Following", exact: true }),
    ).toBeVisible();
    await page.reload();
    await expand(page);
    await expect(
      page.getByRole("button", { name: "Following", exact: true }),
    ).toBeVisible();
    await page.goto("/membership");
    for (const rank of ["Bronze", "Silver", "Gold", "Platinum", "Diamond"])
      await expect(
        page
          .getByRole("list", { name: "Membership ranks" })
          .getByText(rank, { exact: true }),
      ).toBeVisible();
    const after = (await (
      await context.request.get("/api/research")
    ).json()) as ResearchData;
    expect(credit(after)).toEqual(before);
    expect(after.decisions).toEqual(data.decisions);
    expect(after.findings.find((f) => f.id === record!.id)?.status).toBe(
      "pending",
    );
    expect(after.follows?.some((f) => f.finding_id === record!.id)).toBe(true);
    await page.goto(`/findings/new?revise=${record!.version}`);
    const types = page.getByRole("combobox", {
      name: "Contribution type",
      exact: true,
    });
    expect(await types.locator("option").allTextContents()).toEqual([
      "Correction",
      "Update",
    ]);
    await types.selectOption("update");
    await expand(page);
    await expect(page.locator('[name="subject"]')).toHaveValue(
      "Sample pilot: Axis documentation checklist",
    );
    await page
      .locator('[name="correction"]')
      .fill("Documentation-only revision-form check. No saved change.");
    await page.getByRole("checkbox", { name: "I have permission" }).check();
    let revision: Record<string, unknown> | undefined;
    await page.route("**/api/alpha", async (route) => {
      revision = route.request().postDataJSON();
      await route.fulfill({
        status: 503,
        json: { error: { message: "Pilot test: revision not saved." } },
      });
    });
    await page
      .getByRole("button", { name: "Submit updated version", exact: true })
      .click();
    await expect(page.locator('main [role="alert"]')).toContainText(
      "Pilot test: revision not saved.",
    );
    expect(alphaSubmission.safeParse(revision).success).toBe(true);
    expect(revision).toMatchObject({
      finding: record!.id,
      previous: record!.version,
      type: "update",
    });
  } finally {
    await context.close();
  }
});
