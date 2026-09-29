import { test, expect } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { rankFixture } from "./rank-fixture";

test("profile category history opens the attributed record and its correction editor", async ({
  browser,
  baseURL,
}, info) => {
  const { context, data, fixture } = await rankFixture(
    browser,
    baseURL!,
    info.project.use,
  );
  let stage = "home";
  try {
    const finding = data.findings.find(
      (f) =>
        f.author_id === fixture.member &&
        data.alphas?.some(
          (a) =>
            a.version_id === f.current_version &&
            a.category === "Project Analysts",
        ),
    );
    expect(
      finding,
      "Existing isolated category journey required",
    ).toBeDefined();
    const version = data.versions.find(
      (v) => v.id === finding!.current_version,
    )!;
    const page = await context.newPage();
    const dir = `docs/evaluation-foundation/${info.project.name}`;
    await mkdir(dir, { recursive: true });
    await page.goto("/");
    await page
      .locator(".topbar")
      .getByRole("link", { name: "My profile" })
      .click();
    stage = "profile";
    await expect(
      page.getByRole("heading", { name: "Your NFT progression" }),
    ).toBeVisible({ timeout: 30000 });
    await expect(
      page.getByRole("button", { name: "Claim $GRIND" }),
    ).toBeDisabled();
    await page.evaluate(() => {
      window.scrollTo(0, 0);
    });
    await page.screenshot({ path: `${dir}/my-profile.png` });
    const ownVersions = data.versions.filter((v) =>
      data.findings.some(
        (f) => f.id === v.finding_id && f.author_id === fixture.member,
      ),
    );
    if (
      data.outcomes?.some((o) => ownVersions.some((v) => v.id === o.version_id))
    ) {
      stage = "observed_filter";
      await page
        .getByLabel("Record filter", { exact: true })
        .selectOption("observed");
      await expect(
        page.getByText("No records match these filters.", { exact: true }),
      ).toHaveCount(0);
      stage = "restore_all_filter";
      await page
        .getByLabel("Record filter", { exact: true })
        .selectOption("all");
    }
    stage = "history_summary";
    const history = page
      .locator("details")
      .filter({ has: page.getByText(/^Project Analysts: \d+ shown$/) });
    await history.locator(":scope > summary").click();
    stage = "history_record_link";
    await history
      .getByRole("link", { name: version.claim, exact: true })
      .click();
    stage = "attributed_record";
    await expect(page).toHaveURL(new RegExp(`/findings/${finding!.id}$`), {
      timeout: 20000,
    });
    await page
      .getByRole("link", { name: "Review Assistant", exact: true })
      .click();
    const assistant = page.getByRole("region", {
      name: `Review Assistant version ${version.version}`,
      exact: true,
    });
    await expect(
      assistant.getByRole("heading", { name: "Review Assistant", exact: true }),
    ).toBeInViewport();
    for (const heading of [
      "Completeness and provenance",
      "Retrieved evidence",
      "Missing information and assessment questions",
      "Related prior work",
      "AI analysis",
      "Independent review",
    ])
      await expect(
        assistant.getByRole("heading", { name: heading, exact: true }),
      ).toBeVisible();
    await expect(
      assistant.getByText("AI analysis is not connected yet.", { exact: true }),
    ).toBeVisible();
    await expect(
      assistant.getByRole("button", { name: /AI|preliminary/i }),
    ).toHaveCount(0);
    await page.screenshot({ path: `${dir}/review-assistant.png` });
    await assistant
      .getByRole("link", { name: "Later outcome and observations" })
      .click();
    await expect(
      page
        .locator(`#outcome-${version.id}`)
        .getByRole("heading", { name: "Later outcome", exact: true }),
    ).toBeInViewport();
    await page.screenshot({ path: `${dir}/outcome-history.png` });
    await page
      .getByRole("link", { name: "Submit a correction", exact: true })
      .click();
    stage = "correction_editor";
    await expect(
      page.getByLabel("Contribution category", { exact: true }),
    ).toBeVisible({ timeout: 20000 });
    await expect(
      page.getByLabel("Contribution category", { exact: true }),
    ).toHaveValue("Project Analysts");
    await expect(page.getByLabel("What did you find or conclude?")).toHaveValue(
      version.claim,
    );
    await expect(
      page.getByLabel("Contribution type", { exact: true }),
    ).toHaveValue("correction");
    if (data.evaluationAvailable === false)
      await expect(
        page.getByRole("button", { name: "Submit corrected version" }),
      ).toBeDisabled();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.evaluate(() => {
      window.scrollTo(0, 0);
    });
    await page.screenshot({ path: `${dir}/correction-editor.png` });
  } catch {
    throw new Error(
      `Isolated read-only profile view failed at ${stage}; no request headers recorded`,
    );
  } finally {
    await context.close();
  }
});
