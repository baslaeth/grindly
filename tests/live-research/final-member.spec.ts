import { test, expect as baseExpect } from "@playwright/test";
import { rankFixture } from "./rank-fixture";
const expect = baseExpect.configure({ timeout: 60000 });
test.setTimeout(240000);

test("ordinary member has direct work navigation without operator controls", async ({
  browser,
  baseURL,
}, info) => {
  const { context, data } = await rankFixture(
    browser,
    baseURL!,
    info.project.use,
  );
  try {
    expect(data.roles).not.toContain("steward");
    const page = await context.newPage();
    await page.goto("/");
    await expect(
      page.getByRole("link", { name: "Open your Hub", exact: true }),
    ).toBeVisible();
    await page
      .getByRole("link", { name: "Open your Hub", exact: true })
      .click();
    await expect(
      page.getByRole("tab", { name: "Alphas", exact: true }),
    ).toHaveAttribute("aria-selected", "true");
    await page.goto("/review");
    await expect(
      page.getByRole("heading", { name: "Your submissions", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText("Operator tools: reviewers and monitoring", {
        exact: true,
      }),
    ).toHaveCount(0);
    await expect(
      page.getByText("Manage the review queue", { exact: true }),
    ).toHaveCount(0);
    if (
      !data.roles.includes("reviewer") &&
      !data.assignments.some(
        (a) => a.reviewer_id === data.memberId && !a.completed_at,
      )
    ) {
      await expect(
        page.getByRole("heading", {
          name: "Your assigned reviews",
          exact: true,
        }),
      ).toHaveCount(0);
    }
    await page.goto("/findings/new");
    await expect(page.locator('input[name="subject"]')).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Submit for review", exact: true }),
    ).toBeEnabled();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    ).toBe(true);
  } finally {
    await context.close();
  }
});
