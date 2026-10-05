import { test, expect as baseExpect } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { rankFixture } from "./rank-fixture";
import { alphaCategories } from "../../src/alpha/model";
const expect = baseExpect.configure({ timeout: 30000 });

test("launch: responsive signed-in navigation and saved walkthrough", async ({
  browser,
  baseURL,
}, info) => {
  test.setTimeout(600000);
  const session = await rankFixture(browser, baseURL!, info.project.use);
  const page = await session.context.newPage();
  let stage = "home";
  const capture = async (name: string, fullPage = false) => {
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `docs/launch-completion/${name}-${info.project.name}.png`,
      fullPage,
    });
  };
  const navigate = async (name: string) => {
    const mobile = page.getByRole("button", {
      name: "Open navigation",
      exact: true,
    });
    if (await mobile.isVisible()) await mobile.click();
    await page
      .getByRole("navigation", { name: "Main navigation" })
      .getByRole("link", { name, exact: true })
      .click();
  };
  try {
    expect(session.data.rooms).toHaveLength(10);
    expect(session.data.rooms?.every((room) => room.rank === "Bronze")).toBe(
      true,
    );
    const denied = await session.context.request.get(
      "/api/research?room=silver-traders",
    );
    expect([403, 404]).toContain(denied.status());
    await page.goto("/");
    await expect(
      page
        .locator(".topbar")
        .getByRole("link", { name: "My profile", exact: true }),
    ).toBeVisible();
    await capture("home");
    await page
      .getByRole("link", { name: "How XP and ranks work", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "How XP and ranks work", exact: true }),
    ).toBeVisible();
    await capture("xp-guide", true);
    stage = "hub";
    await navigate("Hub");
    await expect(
      page.getByRole("heading", { name: "Hub", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "How XP and ranks work", exact: true }),
    ).toBeVisible();
    await capture("hub");
    stage = "forms";
    await navigate("Submit alpha");
    for (const category of alphaCategories) {
      await page
        .getByLabel("Contribution category", { exact: true })
        .selectOption(category);
      await page
        .getByLabel("Contribution type", { exact: true })
        .selectOption(
          category === "Traders" || category === "Degens"
            ? "prediction"
            : "guide",
        );
      await page
        .getByLabel("Subject or project *", { exact: true })
        .fill(category === "Traders" ? "BTC" : `Sample ${category}`);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      if (category === "Degens" || category === "Project Analysts")
        await capture(`form-${category.toLowerCase().replaceAll(" ", "-")}`);
    }
    stage = "receipt";
    const btc = JSON.parse(
      await readFile(".local/btc-walkthrough.json", "utf8"),
    );
    await page.goto(btc.url);
    await expect(page.getByText(/^Alpha saved:/)).toBeVisible();
    await capture("btc-receipt");
    await page.reload();
    await expect(page.getByText(/^Alpha saved:/)).toBeVisible();
    stage = "intelligence";
    await page
      .getByRole("link", { name: "Explore in Grind Intelligence", exact: true })
      .click();
    await expect(
      page.getByRole("region", { name: "Selected alpha" }),
    ).toContainText("Traders");
    await expect(
      page.getByText("Current evidence overview", { exact: true }),
    ).toHaveCount(0);
    await expect(page.getByText(/Last source check:/)).toBeVisible();
    await capture("btc-intelligence", true);
    await page.getByText("What sources were checked?", { exact: true }).click();
    await expect(
      page.getByRole("button", { name: "Refresh sources", exact: true }),
    ).toBeVisible();
    await page
      .getByText("What information is missing?", { exact: true })
      .click();
    await page
      .getByText("Is there related earlier alpha?", { exact: true })
      .click();
    await page
      .getByText("What happened after the declared horizon?", { exact: true })
      .click();
    await expect(page.getByText(/Outcome pending/)).toBeVisible();
    stage = "profile";
    await page
      .locator(".topbar")
      .getByRole("link", { name: "My profile", exact: true })
      .click();
    await expect(
      page.getByText("150 XP awarded", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Claim $GRIND", exact: true }),
    ).toBeDisabled();
    await page
      .getByRole("heading", { name: "Your NFT progression", exact: true })
      .scrollIntoViewIfNeeded();
    await capture("profile-progression");
    await page
      .getByRole("region", { name: "Your watchlist" })
      .scrollIntoViewIfNeeded();
    await capture("watchlist");
    stage = "review";
    await navigate("Review Desk");
    await expect(
      page.getByRole("heading", { name: "Review Desk", exact: true }),
    ).toBeVisible();
    await capture("review-desk");
  } catch (error) {
    throw new Error(
      `Responsive ${info.project.name} walkthrough at ${stage}: ${error instanceof Error ? error.message.slice(0, 500) : "assertion"}`,
    );
  } finally {
    await session.context.close();
  }
});
