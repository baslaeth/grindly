import { expect, test } from "@playwright/test";
import { mkdir } from "node:fs/promises";

test.use({ baseURL: process.env.UI_REVIEW_URL ?? "http://127.0.0.1:3100" });

test("annotated shell has concise labels, profile shortcut and unchanged access boundary", async ({
  page,
}, info) => {
  await page.goto("/join");
  await expect(
    page.getByRole("heading", { name: "Login", exact: true }),
  ).toBeVisible();
  for (const text of [
    "Specialist exchange / Research, together",
    "Specialist exchange",
    "Your research workspace",
    "An edge of your own. Expertise beyond it.",
    "Your way into the exchange",
    "The specialist exchange",
    "Illustrative explainer / 18 seconds",
    "Public example, illustrative only",
  ])
    await expect(page.getByText(text, { exact: true })).toHaveCount(0);
  await expect(page.getByText(/^Crypto research is too broad/)).toHaveCount(0);
  await expect(
    page.getByText(/^A shared question: what would make/),
  ).toHaveCount(0);
  await expect(page.getByText(/^Illustrative brief:/)).toHaveCount(0);
  await expect(page.locator(".testnet-label")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Open Next.js Dev Tools" }),
  ).toHaveCount(0);
  // The removed duplicate labels do not make the fictional example look genuine.
  await expect(
    page.getByText("Illustrative scenario: fictional people and outcomes"),
  ).toBeVisible();
  await expect(
    page.getByText("Testnet assets have no monetary value."),
  ).toBeVisible();
  const toggle = page.getByRole("button", { name: "Open navigation" });
  const mobile = await toggle.isVisible();
  if (mobile) await toggle.click();
  const nav = page.getByRole("navigation", { name: "Main navigation" });
  for (const [label, href] of [
    ["Home", "/"],
    ["Sign in", "/join"],
    ["Hub", "/workbench"],
    ["Submit alpha", "/findings/new"],
  ] as const)
    await expect(
      nav.getByRole("link", { name: label, exact: true }),
    ).toHaveAttribute("href", href);
  await expect(nav.getByRole("link", { name: "Review Desk" })).toHaveCount(0);
  await expect(nav.getByRole("link", { name: "History" })).toHaveCount(0);
  if (!mobile) {
    await expect(
      page
        .locator(".network")
        .getByRole("img", { name: "Grindly", exact: true }),
    ).toHaveCount(0);
    for (const logo of ["Robinhood Chain"]) {
      const img = page
        .locator(".network")
        .getByRole("img", { name: logo, exact: true });
      await expect(img).toBeVisible();
      await expect
        .poll(() =>
          img.evaluate(
            (node: HTMLImageElement) => node.complete && node.naturalWidth > 0,
          ),
        )
        .toBe(true);
    }
  } else await page.getByRole("button", { name: "Close navigation" }).click();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  if (process.env.GRINDLY_ANNOTATION_CAPTURES === "1") {
    await mkdir("docs/join-annotation-review", { recursive: true });
    await page.screenshot({
      path: `docs/join-annotation-review/${info.project.name}.png`,
      fullPage: true,
    });
  }
  const shortcut = page
    .locator(".topbar")
    .getByRole("link", { name: "My profile" });
  await expect(shortcut).toHaveAttribute("title", "My profile");
  await shortcut.click();
  await expect(page).toHaveURL(/\/membership$/);
  await expect(
    page.getByRole("heading", { name: "My profile", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Active membership required" }),
  ).toBeVisible();
});
