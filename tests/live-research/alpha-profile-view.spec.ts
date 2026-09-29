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
    const dir = `docs/alpha-review/${info.project.name}`;
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
    const history = page
      .locator("details")
      .filter({ has: page.getByText(/^Project Analysts: \d+ submitted$/) });
    await history.locator("summary").click();
    await history
      .getByRole("link", { name: version.claim, exact: true })
      .click();
    stage = "attributed_record";
    await expect(page).toHaveURL(new RegExp(`/findings/${finding!.id}$`), {
      timeout: 20000,
    });
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
