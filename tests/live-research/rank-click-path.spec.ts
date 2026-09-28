import { test, expect, type Page } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { rankFixture } from "./rank-fixture";
import type { ResearchData } from "../../src/research/model";

async function selectRoom(
  page: Page,
  room: { id: string; category: string },
  mobile: boolean,
) {
  if (mobile)
    await page.getByLabel("Room", { exact: true }).selectOption(room.id);
  else
    await page
      .getByRole("navigation", { name: "Bronze rooms" })
      .getByRole("link", { name: room.category, exact: true })
      .click();
  await expect(page).toHaveURL(new RegExp(`room=${room.id}#discussion$`), {
    timeout: 30000,
  });
  await expect(
    page.getByRole("heading", { name: room.category, exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("tab", { name: "Chat", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  await expect(
    page.getByLabel("Add to the discussion", { exact: true }),
  ).toBeVisible();
}
function safeDiagnostics(page: Page) {
  const entries: {
    path: string;
    status: number;
    requestId: string | null;
    completion: string;
  }[] = [];
  page.on("response", async (r) => {
    const path = new URL(r.url()).pathname;
    if (!/^\/(api\/research|workbench|findings)/.test(path)) return;
    const id = await r.headerValue("x-request-id");
    const entry = {
      path,
      status: r.status(),
      requestId: id && /^[a-zA-Z0-9:_-]{1,160}$/.test(id) ? id : null,
      completion: "pending",
    };
    entries.push(entry);
    entry.completion = await r
      .finished()
      .then((e) => (e ? "failed" : "complete"))
      .catch(() => "failed");
  });
  return entries;
}

for (const mode of ["routing", "persistence"] as const) {
  test(`rank chat click path: ${mode}`, async ({ browser, baseURL }, info) => {
    test.skip(
      mode === "persistence" && process.env.GRINDLY_ROOM_WRITES !== "1",
      "Explicit isolated QA room writes only",
    );
    const { context, data } = await rankFixture(
      browser,
      baseURL!,
      info.project.use,
    );
    const page = await context.newPage();
    const diagnostics = safeDiagnostics(page);
    let stage = "entry";
    const folder = `docs/rank-chat-repair/${info.project.name}`;
    await mkdir(folder, { recursive: true });
    const capture = async (name: string) => {
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await page.screenshot({
        path: `${folder}/${name}.png`,
        caret: "initial",
        mask: [
          page.locator(".member-directory li:not(:has(.sample-label))"),
          page.locator(".byline:not(:has(.sample-label))"),
        ],
      });
    };
    try {
      await page.goto("/workbench");
      expect(data.rooms).toHaveLength(10);
      let previousMessage: string | undefined;
      for (const room of data.rooms!) {
        stage = `${mode}:${room.id}`;
        // Deliberately leave chat first: selecting a category must restore it.
        await page.getByRole("link", { name: "Members", exact: true }).click();
        await expect(
          page.getByRole("region", { name: "Space members", exact: true }),
        ).toBeVisible();
        await selectRoom(page, room, info.project.name === "mobile");
        const chat = page.getByRole("region", {
          name: "Specialist discussion",
          exact: true,
        });
        const expected = data.messages
          .filter((m) => m.question_id === room.id)
          .map((m) => `message-${m.id}`)
          .sort();
        expect(
          (
            await chat
              .locator('article[id^="message-"]')
              .evaluateAll((nodes) => nodes.map((n) => n.id))
          ).sort(),
        ).toEqual(expected);
        if (!expected.length) {
          await expect(chat).toContainText("No messages yet in this room");
          if (mode === "routing" && room.category === "Traders")
            await capture("empty-traders-chat");
        }
        if (mode === "routing") continue;
        const message = `DEMO QA click-path ${info.project.name} ${Date.now()} ${room.category}: isolated navigation/persistence check, not research evidence.`;
        await chat
          .getByLabel("Add to the discussion", { exact: true })
          .fill(message);
        const saved = page.waitForResponse(
          (r) =>
            r.url().endsWith("/api/research") &&
            r.request().method() === "POST",
        );
        await chat
          .getByRole("button", { name: "Post message", exact: true })
          .click();
        const response = await saved;
        expect(response.ok()).toBe(true);
        const { id } = await response.json();
        const item = chat.locator(`#message-${id}`);
        await expect(item).toContainText(message, { timeout: 30000 });
        await page.reload();
        await expect(item).toContainText(message);
        if (previousMessage)
          await expect(
            chat.getByText(previousMessage, { exact: true }),
          ).toHaveCount(0);
        if (room.category === "Traders") {
          await item.locator("summary").click();
          await item
            .getByLabel("Your reply")
            .fill(`${message} Reply stays in Traders.`);
          const replySaved = page.waitForResponse(
            (r) =>
              r.url().endsWith("/api/research") &&
              r.request().method() === "POST",
          );
          await item
            .getByRole("button", { name: "Reply", exact: true })
            .click();
          expect((await replySaved).ok()).toBe(true);
          await page.reload();
          await expect(
            chat.getByText(`${message} Reply stays in Traders.`, {
              exact: true,
            }),
          ).toBeVisible();
          await capture("persistent-traders-chat");
          await item
            .getByRole("link", { name: "DEMO QA project", exact: true })
            .click();
          await expect(page).toHaveURL(
            new RegExp(`profile=${data.memberId}$`),
            { timeout: 30000 },
          );
          const dialog = page.getByRole("dialog");
          await expect(
            dialog.getByRole("heading", {
              name: "DEMO QA project",
              exact: true,
            }),
          ).toBeVisible();
          await expect(dialog).toContainText("Personally earned XP");
          await expect(dialog).toContainText(
            "Delegated-work accounting is not active",
          );
          await dialog.getByRole("button", { name: "Back to chat" }).click();
          await expect(page).toHaveURL(
            new RegExp(`room=${room.id}#discussion$`),
            { timeout: 30000 },
          );
          await expect(
            chat.getByLabel("Add to the discussion", { exact: true }),
          ).toBeVisible();
        }
        previousMessage = message;
      }
      if (mode === "persistence") {
        const result = await context.request.get("/api/research");
        expect(result.ok()).toBe(true);
        const after = (await result.json()) as ResearchData;
        expect(after.personalCredit).toEqual(data.personalCredit);
      }
      console.log(
        `${info.project.name}: all ten category clicks open their own chat; ${mode}; no Discussion-tab shortcut`,
      );
    } catch (error) {
      await writeFile(
        info.outputPath("sanitized-click-path.json"),
        JSON.stringify({
          stage,
          finalURL: new URL(page.url()).pathname,
          roomControls: await page
            .getByRole("combobox", { name: "Room", exact: true })
            .count(),
          alertCount: await page.getByRole("alert").count(),
          responses: diagnostics.slice(-15),
          classification:
            error instanceof Error && error.name === "TimeoutError"
              ? "timeout"
              : "assertion_or_request_failure",
        }),
      );
      throw error;
    } finally {
      await context.close();
    }
  });
}

test("Members directory and all isolated profiles are reachable by clicks", async ({
  browser,
  baseURL,
}, info) => {
  const { context, data } = await rankFixture(
    browser,
    baseURL!,
    info.project.use,
  );
  const page = await context.newPage();
  const diagnostics = safeDiagnostics(page);
  const folder = `docs/rank-chat-repair/${info.project.name}`;
  await mkdir(folder, { recursive: true });
  try {
    await page.goto("/workbench");
    const directory = page.getByRole("region", {
      name: "Space members",
      exact: true,
    });
    const dialog = page.getByRole("dialog");
    const profiles = [
      ...data.directory!.map((p) => ({
        id: p.id,
        name: p.name,
        demo: p.is_demo,
        xp: p.personal_xp,
      })),
      ...data.demoProfiles!.map((p) => ({
        id: `demo-${p.id}`,
        name: p.name,
        demo: true,
        xp: p.personal_xp,
      })),
    ];
    for (const profile of profiles) {
      await page.getByRole("link", { name: "Members", exact: true }).click();
      await expect(directory).toBeVisible();
      await expect(directory.locator("a.member-link")).toHaveCount(
        profiles.length,
      );
      const link = directory.locator(
        `a.member-link[href*="profile=${profile.id}"]`,
      );
      await expect(link).toBeVisible();
      // Verify every permitted entry; inspect/capture only isolated and fictional identities.
      if (!profile.demo) continue;
      await link.click();
      await expect(page).toHaveURL(new RegExp(`profile=${profile.id}$`), {
        timeout: 30000,
      });
      await expect(
        dialog.getByRole("heading", { name: profile.name, exact: true }),
      ).toBeVisible();
      await expect(
        dialog
          .locator(".metrics div")
          .filter({ hasText: "Personally earned XP" })
          .locator("dd"),
      ).toHaveText(String(profile.xp));
      await expect(dialog).toContainText("Delegated XP toward this NFT");
      await expect(dialog).not.toContainText("@example.test");
      await dialog.getByRole("button", { name: "Back to chat" }).click();
      await expect(page).toHaveURL(/#discussion$/, { timeout: 30000 });
      await expect(
        page.getByRole("tab", { name: "Chat", exact: true }),
      ).toHaveAttribute("aria-selected", "true");
    }
    await page.getByRole("link", { name: "Members", exact: true }).click();
    await directory.screenshot({
      path: `${folder}/members-directory.png`,
      caret: "initial",
      mask: [directory.locator("li:not(:has(.sample-label))")],
    });
    await directory
      .getByRole("link", { name: "Back to chat", exact: true })
      .click();
    const example = page.locator(".demo-conversation");
    await example.getByRole("link", { name: "Alex", exact: true }).click();
    await expect(page).toHaveURL(/profile=demo-alex$/, { timeout: 30000 });
    await expect(
      dialog.getByRole("heading", { name: "Alex", exact: true }),
    ).toBeVisible();
    await dialog.screenshot({
      path: `${folder}/grinder-alex.png`,
      caret: "initial",
    });
    await expect(
      dialog
        .locator(".metrics div")
        .filter({ hasText: "Work toward another NFT" })
        .locator("dd"),
    ).toHaveText("12");
    await dialog.locator(".metrics").scrollIntoViewIfNeeded();
    // Allow subpixel rounding at mobile device scale, not clipped credit rows.
    await expect(dialog.locator(".metrics")).toBeInViewport({ ratio: 0.999 });
    await dialog.screenshot({
      path: `${folder}/grinder-credit.png`,
      caret: "initial",
    });
    await dialog
      .getByRole("link", { name: "David's NFT", exact: true })
      .click();
    await expect(page).toHaveURL(/profile=demo-david$/, { timeout: 30000 });
    await expect(
      dialog.getByRole("heading", { name: "David", exact: true }),
    ).toBeVisible();
    await expect(
      dialog
        .locator(".metrics div")
        .filter({ hasText: "Delegated XP toward this NFT" })
        .locator("dd"),
    ).toHaveText("20");
    await dialog.screenshot({
      path: `${folder}/owner-david.png`,
      caret: "initial",
    });
    await expect(
      dialog
        .locator(".metrics div")
        .filter({ hasText: "Personally earned XP" })
        .locator("dd"),
    ).toHaveText("60");
    await dialog.locator(".metrics").scrollIntoViewIfNeeded();
    await expect(dialog.locator(".metrics")).toBeInViewport({ ratio: 0.999 });
    await dialog.screenshot({
      path: `${folder}/owner-credit.png`,
      caret: "initial",
    });
    await dialog.getByRole("button", { name: "Back to chat" }).click();
    await expect(page).toHaveURL(/#discussion$/, { timeout: 30000 });
    const ownerPost = example
      .locator("article")
      .filter({
        has: page.getByRole("link", { name: "David", exact: true }),
      })
      .first();
    await expect(ownerPost).not.toContainText("working for");
    await ownerPost.getByRole("link", { name: "David", exact: true }).click();
    await expect(page).toHaveURL(/profile=demo-david$/, { timeout: 30000 });
    await expect(
      dialog.getByRole("heading", { name: "David", exact: true }),
    ).toBeVisible();
    console.log(
      `${info.project.name}: all directory entries present; every QA/fictional profile clicked; grinder/owner/own-post attribution distinct`,
    );
  } catch (error) {
    await writeFile(
      info.outputPath("sanitized-directory-failure.json"),
      JSON.stringify({
        stage: "directory_and_profile_clicks",
        finalURL: new URL(page.url()).pathname,
        responses: diagnostics.slice(-15),
        classification:
          error instanceof Error && error.name === "TimeoutError"
            ? "timeout"
            : "assertion_or_request_failure",
      }),
    );
    throw error;
  } finally {
    await context.close();
  }
});
