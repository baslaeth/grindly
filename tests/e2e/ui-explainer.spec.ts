import { expect, test } from "@playwright/test";

test("narrow and wide explainer scenes keep captions clear of controls", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const width of [320, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/join");
    await page
      .getByRole("button", { name: "Play the core loop", exact: true })
      .click();
    for (let frame = 0; frame < 6; frame++) {
      const text = await page
        .locator(".loop-caption p:last-child")
        .boundingBox();
      const progress = await page.locator(".loop-progress").boundingBox();
      expect(text!.y + text!.height).toBeLessThanOrEqual(progress!.y);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      if (frame < 5)
        await page
          .getByRole("button", { name: "Next explainer scene" })
          .click();
    }
  }
});

test("explainer loads on demand, pauses, replays and finishes without looping", async ({
  page,
}) => {
  await page.goto("/join");
  await expect(page.locator(".loop-player")).toHaveCount(0);
  await page
    .getByRole("button", { name: "Play the core loop", exact: true })
    .click();
  await expect(page.locator(".loop-stage")).toHaveAttribute("data-frame", "0");
  await page.getByRole("button", { name: "Pause explainer" }).click();
  await expect(page.locator(".loop-player")).toHaveAttribute(
    "data-playing",
    "false",
  );
  await page.clock.install();
  await page.clock.fastForward(6000);
  await expect(page.locator(".loop-stage")).toHaveAttribute("data-frame", "0");
  await page.getByRole("button", { name: "Next explainer scene" }).click();
  await expect(page.locator(".loop-stage")).toHaveAttribute("data-frame", "1");
  await page.getByRole("button", { name: "Replay explainer" }).click();
  for (let frame = 1; frame <= 5; frame++) {
    await page.clock.runFor(3001);
    await expect(page.locator(".loop-stage")).toHaveAttribute(
      "data-frame",
      String(frame),
    );
  }
  await page.clock.runFor(3001);
  await expect(
    page.getByText("End of explainer", { exact: true }),
  ).toBeVisible();
  await page.clock.runFor(30000);
  await expect(page.locator(".loop-stage")).toHaveAttribute("data-frame", "5");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("reduced motion stays static with keyboard-operable scene controls", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/join");
  await page
    .getByRole("button", { name: "Play the core loop", exact: true })
    .click();
  await expect(page.locator(".loop-player")).toHaveAttribute(
    "data-playing",
    "false",
  );
  await page.getByRole("button", { name: "Next explainer scene" }).focus();
  await page.keyboard.press("Enter");
  await expect(page.locator(".loop-stage")).toHaveAttribute("data-frame", "1");
  expect(
    await page
      .locator(".loop-outcome")
      .evaluate((el) => getComputedStyle(el).animationName),
  ).toBe("none");
  await expect(
    page.getByRole("button", { name: "Pause explainer" }),
  ).toHaveCount(0);
});

test("keyboard skip link and high contrast brand remain usable", async ({
  page,
}) => {
  await page.goto("/join");
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("link", { name: "Skip to content" }),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("#main")).toBeFocused();
  const logo = page.locator(".brand img");
  await expect(logo).toHaveAttribute("src", "/brand/grindly/grindly-logo.svg");
  expect(
    await logo.evaluate((el) => (el as HTMLImageElement).naturalWidth > 0),
  ).toBe(true);
  const menu = page.getByRole("button", { name: "Open navigation" });
  if (await menu.isVisible()) await menu.hover();
  const ratios = await page.evaluate(() => {
    const luminance = (value: string) => {
      const channels = value
        .match(/[\d.]+/g)!
        .slice(0, 3)
        .map(Number)
        .map((v) => {
          const n = v / 255;
          return n <= 0.04045 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4;
        });
      return (
        channels[0]! * 0.2126 + channels[1]! * 0.7152 + channels[2]! * 0.0722
      );
    };
    return [
      "body",
      ".brand",
      ".sidebar-heading",
      ".join-intro .button",
      ".sample-label",
      ".muted",
      ...(getComputedStyle(document.querySelector(".nav-toggle")!).display !==
      "none"
        ? [".nav-toggle"]
        : []),
    ].map((selector) => {
      const el = document.querySelector(selector)!;
      let background = getComputedStyle(el).backgroundColor;
      let parent = el.parentElement;
      while (background === "rgba(0, 0, 0, 0)" && parent) {
        background = getComputedStyle(parent).backgroundColor;
        parent = parent.parentElement;
      }
      const a = luminance(getComputedStyle(el).color),
        b = luminance(background);
      return {
        selector,
        ratio: (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05),
      };
    });
  });
  for (const { selector, ratio } of ratios)
    expect(ratio, selector).toBeGreaterThanOrEqual(4.5);
});
