import { test, expect } from "@playwright/test";
import { rankFixture } from "./rank-fixture";
import { categories } from "../../src/research/spaces";
import { categoryFields } from "../../src/alpha/checklists";

test("all nine editor contexts are immediately available without submitting as the member", async ({
  browser,
  baseURL,
}, info) => {
  const a = await rankFixture(browser, baseURL!, info.project.use);
  const page = await a.context.newPage();
  let stage = "home";
  try {
    await page.goto("/");
    stage = "open_hub";
    await page.getByRole("link", { name: "Enter Hub", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: /Bronze \/ .* chat/ }),
    ).toBeVisible({ timeout: 30000 });
    stage = "open_editor";
    await page
      .getByRole("link", { name: "Submit alpha", exact: true })
      .last()
      .click();
    const category = page.getByLabel("Contribution category", { exact: true });
    await expect(category).toBeVisible({ timeout: 30000 });
    await page
      .getByLabel("What did you find or conclude?")
      .fill("Unsaved isolated form input, never submitted.");
    for (const name of categories) {
      stage = `category:${name}`;
      await category.selectOption(name);
      const region = page.getByRole("region", {
        name: "Category context",
        exact: true,
      });
      await expect(region).toBeVisible();
      for (const field of categoryFields[name]) {
        stage = `${name}:${field.key}`;
        const input = region.locator(`[name="detail-${field.key}"]`);
        await expect(input).toHaveAttribute("required", "");
        await region
          .getByLabel(`${field.label} answer`, { exact: true })
          .selectOption("unknown");
        await expect(input).toHaveValue("Unknown");
        stage = `${name}:${field.key}:provide_context`;
        await region
          .getByLabel(`${field.label} answer`, { exact: true })
          .selectOption("details");
        await expect(input).toHaveValue("");
      }
      const horizon = page.getByLabel("Horizon or milestone (UTC)");
      stage = `${name}:conditional_horizon`;
      await page
        .getByLabel("Contribution type", { exact: true })
        .selectOption("prediction");
      await expect(horizon).toHaveAttribute("required", "");
      for (const type of [
        "find",
        "analysis",
        "warning",
        "correction",
        "followup",
      ]) {
        await page
          .getByLabel("Contribution type", { exact: true })
          .selectOption(type);
        await expect(horizon).not.toHaveAttribute("required", "");
      }
      await expect(
        page.getByLabel("What did you find or conclude?"),
      ).toHaveValue("Unsaved isolated form input, never submitted.");
      stage = `${name}:overflow`;
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
    }
    if (!a.data.evaluationAvailable)
      await expect(
        page.getByRole("button", { name: "Submit for review", exact: true }),
      ).toBeDisabled();
  } catch {
    throw new Error(
      `Read-only editor failed at ${stage}; final path ${new URL(page.url()).pathname}; no member submission sent or credentials recorded`,
    );
  } finally {
    await a.context.close();
  }
});
