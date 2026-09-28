import { test, expect, type Page } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import sharp from "sharp";
import { rankFixture } from "./rank-fixture";
import type { ChatSnapshot } from "../../src/chat/model";
import { categories } from "../../src/research/spaces";

async function chooseRoom(page: Page, category: string) {
  const mobile = page.getByRole("combobox", { name: "Room", exact: true });
  if ((page.viewportSize()?.width ?? 1280) < 760) {
    await expect(mobile).toBeVisible({ timeout: 20000 });
    const value = await mobile
      .locator("option")
      .filter({ hasText: new RegExp(`^${category}( \\(\\d+ unread\\))?$`) })
      .last()
      .getAttribute("value");
    await mobile.selectOption(value!);
  } else
    await page
      .getByRole("navigation", { name: "Bronze rooms" })
      .getByRole("link", { name: new RegExp(`^${category}(\\s|$)`) })
      .click();
  await expect(
    page.getByRole("heading", {
      name: `Bronze / ${category} chat`,
      exact: true,
    }),
  ).toBeVisible({ timeout: 20000 });
  await expect(
    page.getByLabel(`Message ${category}`, { exact: true }),
  ).toBeVisible();
}
const composer = (page: Page) =>
  page.getByLabel("Message Traders", { exact: true });

test("unread indicators follow persisted room read state and empty view stays usable", async ({
  browser,
  baseURL,
}, info) => {
  const a = await rankFixture(
    browser,
    baseURL!,
    info.project.use,
    false,
    "project",
  );
  const b = await rankFixture(
    browser,
    baseURL!,
    info.project.use,
    false,
    "risk",
  );
  try {
    const sender = await a.context.newPage();
    const reader = await b.context.newPage();
    await reader.goto("/workbench");
    await chooseRoom(reader, "Traders");
    await reader.bringToFront();
    await expect
      .poll(async () => (await snapshot(reader)).unread["bronze-traders"], {
        timeout: 20000,
      })
      .toBe(0);
    await chooseRoom(reader, "General");
    await sender.goto("/workbench");
    await chooseRoom(sender, "Traders");
    const message = `Sample unread check ${Date.now()}`;
    await composer(sender).fill(message);
    await composer(sender).press("Enter");
    await expect(composer(sender)).toHaveValue("", { timeout: 20000 });
    await reader.bringToFront();
    if ((reader.viewportSize()?.width ?? 1280) < 760)
      await expect(
        reader
          .getByRole("combobox", { name: "Room", exact: true })
          .locator('option[value="bronze-traders"]'),
      ).toHaveText(/Traders \([1-9]\d* unread\)/, { timeout: 20000 });
    else
      await expect(
        reader
          .getByRole("navigation", { name: "Bronze rooms" })
          .getByRole("link", { name: /^Traders/ })
          .locator(".room-unread"),
      ).toBeVisible({ timeout: 20000 });
    await chooseRoom(reader, "Traders");
    await expect(reader.locator(".conversation")).toContainText(message, {
      timeout: 20000,
    });
    await expect
      .poll(async () => (await snapshot(reader)).unread["bronze-traders"], {
        timeout: 20000,
      })
      .toBe(0);
    // UI-only empty-state simulation AFTER the real authorized API read.
    // Existing persistent fixture history is neither deleted nor called empty.
    await reader.route("**/api/chat?*", async (route) => {
      const response = await route.fetch();
      if (!response.ok()) return route.fulfill({ response });
      const data = await response.json();
      await route.fulfill({
        response,
        json: { ...data, messages: [], hasOlder: false },
      });
    });
    await chooseRoom(reader, "Whitelist Hunters");
    await expect(
      reader.getByText("No messages yet in this room. Start the conversation."),
    ).toBeVisible({ timeout: 20000 });
    await reader
      .getByLabel("Message Whitelist Hunters", { exact: true })
      .fill("Sample unsent empty-state draft");
    await expect(
      reader.getByRole("button", { name: "Send", exact: true }),
    ).toBeEnabled();
  } finally {
    await a.context.close();
    await b.context.close();
  }
});
async function snapshot(page: Page) {
  const response = await page.request.get("/api/chat?room=bronze-traders");
  expect(response.ok()).toBe(true);
  return (await response.json()) as ChatSnapshot;
}
async function capture(page: Page, name: string, project: string) {
  await mkdir(`docs/member-experience-review/${project}`, { recursive: true });
  await page.evaluate(() => {
    window.scrollTo(0, 0);
    (document.activeElement as HTMLElement)?.blur();
  });
  await page.screenshot({
    path: `docs/member-experience-review/${project}/${name}.png`,
    fullPage: !(await page.getByRole("dialog").isVisible()),
  });
}
function observe(page: Page) {
  const records: {
    path: string;
    status: number | null;
    requestId: string | null;
    completion: string;
    classification: string;
  }[] = [];
  page.on("response", async (r) => {
    const path = new URL(r.url()).pathname;
    if (!/^\/(api\/(chat|opportunities)|workbench|membership)/.test(path))
      return;
    const raw = await r.headerValue("x-request-id");
    const entry = {
      path,
      status: r.status(),
      requestId: raw && /^[a-zA-Z0-9:_-]{1,160}$/.test(raw) ? raw : null,
      completion: "pending",
      classification:
        r.status() >= 500
          ? "service_unavailable"
          : r.status() >= 400
            ? "request_denied"
            : "ok",
    };
    records.push(entry);
    entry.completion = await r
      .finished()
      .then((e) => (e ? "failed" : "complete"))
      .catch(() => "failed");
  });
  page.on("requestfailed", (r) => {
    const path = new URL(r.url()).pathname;
    if (/^\/(api\/(chat|opportunities)|workbench|membership)/.test(path))
      records.push({
        path,
        status: null,
        requestId: null,
        completion: "failed",
        classification: "transport_or_cancelled",
      });
  });
  return records;
}

test("two isolated members exchange persistent chat, media, replies and reactions through navigation", async ({
  browser,
  baseURL,
}, info) => {
  const a = await rankFixture(
    browser,
    baseURL!,
    info.project.use,
    false,
    "project",
  );
  const b = await rankFixture(
    browser,
    baseURL!,
    info.project.use,
    false,
    "risk",
  );
  let stage = "home";
  let page: Page | undefined;
  let diagnostics: ReturnType<typeof observe> = [];
  try {
    page = await a.context.newPage();
    const peer = await b.context.newPage();
    diagnostics = observe(page);
    const token = `Sample exchange ${Date.now()}`;
    await page.goto("/");
    await page.getByRole("link", { name: "Enter Hub", exact: true }).click();
    await chooseRoom(page, "Traders");
    await peer.goto("/");
    await peer.getByRole("link", { name: "Enter Hub", exact: true }).click();
    await chooseRoom(peer, "Traders");
    await expect(
      page.getByRole("navigation", { name: /Silver rooms/ }),
    ).toHaveCount(0);
    stage = "keyboard_and_delivery";
    await composer(page).fill(`${token}: Compare the documented assumptions.`);
    await composer(page).press("Shift+Enter");
    await composer(page).press("x");
    await expect(composer(page)).toHaveValue(
      `${token}: Compare the documented assumptions.\nx`,
    );
    const before = (await snapshot(page)).messages.length;
    await composer(page).dispatchEvent("keydown", {
      key: "Enter",
      code: "Enter",
      isComposing: true,
      keyCode: 229,
      bubbles: true,
    });
    await expect(composer(page)).not.toHaveValue("");
    expect((await snapshot(page)).messages.length).toBe(before);
    let navigations = 0;
    peer.on("framenavigated", (frame) => {
      if (frame === peer.mainFrame()) navigations++;
    });
    await composer(page).press("Enter");
    await expect(composer(page)).toHaveValue("", { timeout: 20000 });
    await peer.bringToFront();
    await expect(peer.locator(".conversation")).toContainText(token, {
      timeout: 20000,
    });
    expect(navigations).toBe(0);
    const first = (await snapshot(page)).messages.find((m) =>
      m.body.startsWith(token),
    )!;
    await peer
      .locator(`#message-${first.id}`)
      .getByRole("button", { name: /Reply to/ })
      .click();
    await composer(peer).fill(`${token}: Here is the independent limitation.`);
    await composer(peer).press("Enter");
    await expect(composer(peer)).toHaveValue("", { timeout: 20000 });
    await peer
      .locator(`#message-${first.id}`)
      .getByRole("button", { name: "React", exact: true })
      .click();
    await peer.getByRole("button", { name: "Thanks", exact: true }).click();
    await expect(
      peer
        .locator(`#message-${first.id}`)
        .getByRole("button", { name: "Thanks 1" }),
    ).toBeVisible({ timeout: 20000 });
    stage = "images_and_gif";
    const png = await sharp({
      create: { width: 160, height: 90, channels: 3, background: "#d4dde0" },
    })
      .png()
      .toBuffer();
    const gif = await sharp(
      Buffer.concat([
        Buffer.alloc(32 * 32 * 3, 50),
        Buffer.alloc(32 * 32 * 3, 210),
      ]),
      { raw: { width: 32, height: 64, channels: 3, pageHeight: 32 } },
    )
      .gif({ delay: [250, 250], loop: 0 })
      .toBuffer();
    expect((await sharp(gif, { animated: true }).metadata()).pages).toBe(2);
    await page.getByLabel("Choose images or GIFs").setInputFiles([
      { name: "sample-evidence.png", mimeType: "image/png", buffer: png },
      { name: "sample-motion.gif", mimeType: "image/gif", buffer: gif },
    ]);
    await expect(page.getByAltText("Attachment preview")).toHaveCount(2);
    await page.getByRole("button", { name: "Send", exact: true }).click();
    await expect(page.getByAltText("Attachment preview")).toHaveCount(0, {
      timeout: 30000,
    });
    const media = (await snapshot(page)).messages
      .filter(
        (m) => m.author === a.fixture.member && m.attachments.length === 2,
      )
      .at(-1)!;
    await peer.bringToFront();
    await expect(
      peer.locator(`#message-${media.id}`).getByAltText("Shared animated GIF"),
    ).toBeVisible({ timeout: 20000 });
    for (const attachment of media.attachments) {
      const response = await b.context.request.get(
        `/api/chat/media?id=${attachment.id}`,
      );
      expect(response.ok()).toBe(true);
      expect(response.headers()["cache-control"]).toContain("no-store");
      if (attachment.type === "image/gif")
        expect(
          (await sharp(await response.body(), { animated: true }).metadata())
            .pages,
        ).toBe(2);
    }
    const anonymous = await browser.newContext({ baseURL });
    try {
      expect(
        (
          await anonymous.request.get(
            `/api/chat/media?id=${media.attachments[0]!.id}`,
          )
        ).status(),
      ).toBe(401);
    } finally {
      await anonymous.close();
    }
    await peer.reload();
    await expect(peer.locator(`#message-${first.id}`)).toContainText(token);
    await expect(
      peer.getByRole("button", { name: "Thanks 1" }).first(),
    ).toBeVisible();
    stage = "profiles";
    await page.bringToFront();
    await capture(page, "chat", info.project.name);
    await page
      .locator(`#message-${first.id}`)
      .getByRole("link", { name: new RegExp("Open .* profile") })
      .click();
    await expect(page.getByRole("dialog")).toBeVisible({ timeout: 20000 });
    await expect(page.getByRole("dialog")).toContainText(
      a.data.profiles.find((p) => p.member_id === a.fixture.member)!
        .display_name,
    );
    await expect(page.getByRole("dialog")).toContainText(
      "Personally earned XP",
    );
    await expect(page.getByRole("dialog")).toContainText(
      "Delegated XP toward this NFT",
    );
    await capture(page, "profile", info.project.name);
    await page.getByRole("button", { name: "Back to chat" }).click();
    await expect(
      page.getByRole("heading", { name: "Bronze / Traders chat" }),
    ).toBeVisible();
    await page.getByRole("link", { name: "Members", exact: true }).click();
    await expect(page.locator(".member-directory .member-link")).toHaveCount(
      a.data.directory!.length,
    );
    await capture(page, "members", info.project.name);
    await page
      .locator(".member-directory .member-link")
      .filter({
        hasText: b.data.profiles.find((p) => p.member_id === b.fixture.member)!
          .display_name,
      })
      .click();
    await expect(page.getByRole("dialog")).toBeVisible({ timeout: 20000 });
    await expect(page.getByRole("dialog")).toContainText(
      b.data.profiles.find((p) => p.member_id === b.fixture.member)!
        .display_name,
    );
    await page.getByRole("button", { name: "Back to chat" }).click();
    expect(
      (await a.context.request.get("/api/chat?room=silver-general")).status(),
    ).toBe(403);
    expect(
      (
        await a.context.request.post("/api/chat", {
          data: {
            room: "silver-general",
            request: crypto.randomUUID(),
            mutation: {
              action: "send",
              body: "Forbidden",
              reply: null,
              attachments: [],
            },
          },
        })
      ).status(),
    ).toBe(403);
    console.log(
      `${info.project.name}: same-rank text/image/animated GIF/reply/reaction persistence and profile navigation passed`,
    );
  } catch (error) {
    await writeFile(
      info.outputPath("safe-failure.json"),
      JSON.stringify({
        stage,
        url: page ? new URL(page.url()).pathname : null,
        responses: diagnostics.slice(-20),
        classification: "journey_failure",
      }),
    );
    throw error;
  } finally {
    await a.context.close();
    await b.context.close();
  }
});

test("room routing, drafts, failed-send retry, edit/delete and sample opportunities remain truthful", async ({
  browser,
  baseURL,
}, info) => {
  const a = await rankFixture(browser, baseURL!, info.project.use);
  let page: Page | undefined;
  let diagnostics: ReturnType<typeof observe> = [];
  try {
    page = await a.context.newPage();
    diagnostics = observe(page);
    await page.goto("/workbench");
    for (const category of ["General", ...categories])
      await chooseRoom(page, category);
    await chooseRoom(page, "Traders");
    const draft = `Sample draft ${Date.now()}`;
    await composer(page).fill(draft);
    await chooseRoom(page, "Degens");
    await expect(
      page.getByLabel("Message Degens", { exact: true }),
    ).toHaveValue("");
    await chooseRoom(page, "Traders");
    await expect(composer(page)).toHaveValue(draft);
    await page.reload();
    await expect(composer(page)).toHaveValue(draft);
    let interrupted = false;
    await page.route("**/api/chat", async (route) => {
      if (
        route.request().method() === "POST" &&
        route.request().postDataJSON()?.mutation?.action === "send" &&
        !interrupted
      ) {
        interrupted = true;
        await route.fetch();
        await route.abort("failed");
      } else await route.continue();
    });
    await composer(page).press("Enter");
    await expect(page.getByRole("button", { name: "Retry send" })).toBeEnabled({
      timeout: 20000,
    });
    await expect(composer(page)).toHaveValue(draft);
    await page.getByRole("button", { name: "Retry send" }).click();
    await expect(composer(page)).toHaveValue("", { timeout: 20000 });
    expect(
      (await snapshot(page)).messages.filter((m) => m.body === draft),
    ).toHaveLength(1);
    const sent = (await snapshot(page)).messages.find((m) => m.body === draft)!;
    await page
      .locator(`#message-${sent.id}`)
      .getByRole("button", { name: "Edit message" })
      .click();
    await page
      .getByRole("textbox", { name: "Edit message", exact: true })
      .fill(`${draft} corrected`);
    await page.getByRole("button", { name: "Save edit" }).click();
    await expect(page.locator(`#message-${sent.id}`)).toContainText("Edited", {
      timeout: 20000,
    });
    page.once("dialog", (dialog) => dialog.accept());
    await page
      .locator(`#message-${sent.id}`)
      .getByRole("button", { name: "Delete message" })
      .click();
    await expect(page.locator(`#message-${sent.id}`)).toContainText(
      "Message deleted",
      { timeout: 20000 },
    );
    await page.goto("/");
    await page
      .getByRole("link", { name: "Explore sample opportunities" })
      .click();
    const cards = page.locator(".opportunity-card");
    await expect(cards).toHaveCount(3, { timeout: 20000 });
    const roundtable = cards.filter({
      hasText: "Sample: specialist roundtable",
    });
    const action = roundtable.getByRole("button", { name: "Express interest" });
    if (await action.isVisible()) await action.click();
    await expect(roundtable).toContainText("Sample status: interested", {
      timeout: 20000,
    });
    await expect(
      cards.filter({ hasText: "Sample: Silver research preview" }),
    ).toContainText("Eligible ranks: Silver");
    await expect(
      cards.getByRole("link", { name: /campaign|claim/ }),
    ).toHaveCount(0);
    await capture(page, "home-samples", info.project.name);
    await page
      .locator(".topbar")
      .getByRole("link", { name: "My profile" })
      .click();
    await expect(
      page.getByRole("button", { name: "Claim $GRIND" }),
    ).toBeDisabled({ timeout: 20000 });
    await expect(page.getByText("To finalize", { exact: true })).toHaveCount(2);
    await capture(page, "my-profile", info.project.name);
    await page.goto("/workbench?room=bronze-traders");
    await composer(page).fill("Sample draft cleared on logout");
    const menu = page.getByRole("button", { name: "Open navigation" });
    if (await menu.isVisible()) await menu.click();
    await page.getByRole("button", { name: "Sign out", exact: true }).click();
    await expect(page).toHaveURL(/\/$/);
    expect(
      await page.evaluate(() =>
        Object.keys(localStorage).filter((k) =>
          k.startsWith("grindly:chat-draft:"),
        ),
      ),
    ).toEqual([]);
  } catch (error) {
    await writeFile(
      info.outputPath("safe-failure.json"),
      JSON.stringify({
        stage: "routing_retry_profile",
        url: page ? new URL(page.url()).pathname : null,
        responses: diagnostics.slice(-20),
        classification: "journey_failure",
      }),
    );
    throw error;
  } finally {
    await a.context.close();
  }
});

test("selected attachment drafts, paste/drop, reconnect and older history remain usable", async ({
  browser,
  baseURL,
}, info) => {
  const a = await rankFixture(browser, baseURL!, info.project.use);
  try {
    const page = await a.context.newPage();
    await page.goto("/workbench");
    const older = page.getByRole("button", { name: "Load older messages" });
    await expect(older).toBeVisible({ timeout: 20000 });
    const before = await page.locator(".chat-message").count();
    await older.click();
    await expect
      .poll(() => page.locator(".chat-message").count())
      .toBeGreaterThan(before);
    await chooseRoom(page, "Traders");
    const png = await sharp({
      create: { width: 50, height: 40, channels: 3, background: "#aaaaaa" },
    })
      .png()
      .toBuffer();
    await page.getByLabel("Choose images or GIFs").setInputFiles({
      name: "sample-draft.png",
      mimeType: "image/png",
      buffer: png,
    });
    await expect(page.getByAltText("Attachment preview")).toHaveCount(1);
    await expect
      .poll(() =>
        page.evaluate(
          async () =>
            new Promise<number>((resolve) => {
              const open = indexedDB.open("grindly-chat-drafts-v1");
              open.onsuccess = () => {
                const request = open.result
                  .transaction("files")
                  .objectStore("files")
                  .count();
                request.onsuccess = () => {
                  resolve(request.result);
                  open.result.close();
                };
              };
            }),
        ),
      )
      .toBeGreaterThan(0);
    await page.reload();
    await expect(page.getByAltText("Attachment preview")).toHaveCount(1, {
      timeout: 20000,
    });
    await page.getByRole("button", { name: "Remove attachment" }).click();
    await composer(page).evaluate(
      (element, bytes) => {
        const data = new DataTransfer();
        data.items.add(
          new File([new Uint8Array(bytes)], "sample-paste.png", {
            type: "image/png",
          }),
        );
        element.dispatchEvent(
          new ClipboardEvent("paste", {
            clipboardData: data,
            bubbles: true,
            cancelable: true,
          }),
        );
      },
      [...png],
    );
    await expect(page.getByAltText("Attachment preview")).toHaveCount(1);
    await page.getByRole("button", { name: "Remove attachment" }).click();
    await page.locator(".chat-composer").evaluate(
      (element, bytes) => {
        const data = new DataTransfer();
        data.items.add(
          new File([new Uint8Array(bytes)], "sample-drop.png", {
            type: "image/png",
          }),
        );
        element.dispatchEvent(
          new DragEvent("drop", {
            dataTransfer: data,
            bubbles: true,
            cancelable: true,
          }),
        );
      },
      [...png],
    );
    await expect(page.getByAltText("Attachment preview")).toHaveCount(1);
    await page.getByRole("button", { name: "Remove attachment" }).click();
    await a.context.setOffline(true);
    await composer(page).fill("Sample retained during reconnect");
    await composer(page).press("Enter");
    await expect(page.getByRole("button", { name: "Retry send" })).toBeEnabled({
      timeout: 20000,
    });
    await expect(composer(page)).toHaveValue(
      "Sample retained during reconnect",
    );
    await a.context.setOffline(false);
    await page.getByRole("button", { name: "Retry send" }).click();
    await expect(composer(page)).toHaveValue("", { timeout: 20000 });
    await page.getByRole("button", { name: "Insert emoji" }).click();
    await page.getByRole("button", { name: /Insert.*\uD83D\uDC4D/ }).click();
    await expect(composer(page)).toHaveValue("\uD83D\uDC4D");
    await composer(page).fill("");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  } finally {
    await a.context.setOffline(false);
    await a.context.close();
  }
});
