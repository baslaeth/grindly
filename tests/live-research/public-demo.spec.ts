import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { hashInvitation } from "../../src/server/auth/input";
import type { ResearchData } from "../../src/research/model";

test.setTimeout(240000);
test("shared demo code creates separate sample access and supports the member journey", async ({
  browser,
  baseURL,
}, info) => {
  if (
    !baseURL ||
    !["http://localhost:3000", "https://grindly.io"].includes(baseURL)
  )
    throw Error("Unexpected QA destination");
  if (
    new URL(process.env.SUPABASE_URL!).hostname !==
    "errbtterppmvtlfltgzp.supabase.co"
  )
    throw Error("Unexpected project");
  const delivery = await readFile(process.env.DEMO_CODE_FILE!, "utf8");
  const code = delivery.match(/^Demo invitation code: (.+)$/m)?.[1];
  if (!code) throw Error("Ignored demo code file required");
  const db = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  const email = `grindly-qa-public-demo-${info.project.name}@example.test`;
  const users = await db.auth.admin.listUsers();
  if (users.error) throw Error("QA identity lookup failed");
  if (!users.data.users.some((u) => u.email === email)) {
    const created = await db.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: { demo: true, purpose: "Isolated public demo QA" },
    });
    if (created.error) throw Error("QA identity creation failed");
  }
  const hash = hashInvitation(code);
  const reserve = await db.rpc("reserve_demo_otp", {
    p_token_hash: hash,
    p_email: email,
  });
  if (reserve.error) throw Error("QA invitation reservation failed");
  const otp = await db.auth.admin.generateLink({ type: "magiclink", email });
  if (otp.error) throw Error("QA OTP creation failed");
  const context = await browser.newContext({
    ...info.project.use,
    baseURL,
    extraHTTPHeaders: { Origin: baseURL },
  });
  const entry = await context.newPage();
  await entry.goto("/join?mode=demo");
  await expect(
    entry.getByLabel("Demo invitation code", { exact: true }),
  ).toBeVisible();
  await mkdir(".local/public-demo-evidence", { recursive: true });
  await entry.screenshot({
    path: `.local/public-demo-evidence/${info.project.name}-entry.png`,
  });
  expect(
    await entry.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBe(true);
  await entry.close();
  // Simulate delivery only for the reserved .test identity. Verification and
  // enrollment use the real endpoint; this does not prove inbox delivery.
  await context.addCookies([
    {
      name: "grindly-otp-intent",
      value: JSON.stringify({ email, invitationHash: hash, demo: true }),
      url: baseURL,
      httpOnly: true,
      sameSite: "Strict",
      secure: baseURL.startsWith("https:"),
    },
  ]);
  try {
    const page = await context.newPage();
    await page.goto("/join?mode=demo");
    await page
      .getByLabel("Email code", { exact: true })
      .fill(otp.data.properties.email_otp);
    await page
      .getByRole("button", { name: "Verify code", exact: true })
      .click();
    await expect(page).toHaveURL(/\/workbench$/, { timeout: 60000 });
    await expect(
      page.getByRole("tab", { name: "Alphas", exact: true }),
    ).toBeVisible({ timeout: 60000 });
    const response = await context.request.get("/api/research");
    expect(response.ok()).toBe(true);
    const data = (await response.json()) as ResearchData;
    expect(data.token.demo).toBe(true);
    expect(data.token.id).toBe("");
    expect(data.roles).toEqual([]);
    expect(data.rooms).toHaveLength(10);
    expect(data.localAIEnabled).toBe(false);
    const evidence = ".local/public-demo-evidence";
    await mkdir(evidence, { recursive: true });
    await page.screenshot({ path: `${evidence}/${info.project.name}-hub.png` });
    for (const path of [
      "/membership",
      "/following",
      "/review",
      "/findings/new",
    ]) {
      await page.goto(path);
      await expect(page.locator("main > .sample-label")).toHaveText("Demo");
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
      ).toBe(true);
      if (path === "/review")
        await expect(
          page.getByText("Operator tools: reviewers and monitoring", {
            exact: true,
          }),
        ).toHaveCount(0);
      if (path === "/membership") {
        await expect(page.locator(".rank-collection li")).toHaveCount(5);
        await page.screenshot({
          path: `${evidence}/${info.project.name}-profile.png`,
        });
      }
    }
    const existing = data.alphas?.find(
      (a) => a.subject === "Sample: Axis points signing and task limits",
    );
    expect(existing).toBeTruthy();
    const finding = data.versions.find(
      (v) => v.id === existing!.version_id,
    )!.finding_id;
    await page.goto(`/intelligence?alpha=${finding}`);
    await expect(page.locator("#intelligence-alpha")).toHaveValue(finding);
    await page.screenshot({
      path: `${evidence}/${info.project.name}-intelligence.png`,
    });
    await page.goto("/findings/new");
    await page
      .getByRole("combobox", { name: "Contribution category", exact: true })
      .selectOption("Airdrop Hunters");
    await page
      .getByRole("combobox", { name: "Contribution type", exact: true })
      .selectOption("guide");
    for (const details of await page.locator("main details").all())
      if (
        (await details.isVisible()) &&
        (await details.getAttribute("open")) === null
      )
        await details.locator(":scope > summary").click();
    for (const answer of await page
      .locator('.category-field select[aria-label$=" answer"]')
      .all())
      await answer.selectOption("unknown");
    const title = `Sample demo access check: ${info.project.name}`;
    const already = data.alphas?.find((a) => a.subject === title);
    if (!already) {
      await page.locator('[name="subject"]').fill(title);
      await page
        .locator('[name="airdrop-official"]')
        .fill("https://docs.axisrobotics.ai/contributor-guide/sign-and-verify");
      await page
        .locator('[name="airdrop-confirmed"]')
        .fill(
          "Isolated interface test. No program claims have been independently checked by this demo visitor.",
        );
      await page
        .locator('[name="airdrop-steps"]')
        .fill(
          "Open the official documentation and read the signing requirements. This demo did not perform tasks or transactions.",
        );
      await page
        .locator('[name="costOrRisk"]')
        .fill(
          "Sample only. Costs, eligibility and rewards are unknown; do not act on this test.",
        );
      await page
        .locator('[name="addition"]')
        .fill(
          "Isolated verification of shared demo access and contribution persistence.",
        );
      await page
        .locator('[name="evidence"]')
        .fill("https://docs.axisrobotics.ai/contributor-guide/sign-and-verify");
      await page.getByRole("checkbox", { name: "I have permission" }).check();
      await page
        .getByRole("button", { name: "Submit for review", exact: true })
        .click();
      await expect(page).toHaveURL(/\/findings\/[a-f0-9-]+\?saved=/, {
        timeout: 60000,
      });
    } else {
      const saved = data.versions.find((v) => v.id === already.version_id)!;
      await page.goto(`/findings/${saved.finding_id}`);
    }
    await page.reload();
    await expect(
      page.getByRole("heading", { name: title, exact: true }),
    ).toBeVisible();
    const follow = page.getByRole("button", { name: "Follow", exact: true });
    if (await follow.isVisible()) await follow.click();
    await page.reload();
    await expect(
      page.getByRole("button", { name: "Following", exact: true }),
    ).toBeVisible();
    await writeFile(
      `${evidence}/${info.project.name}-result.json`,
      JSON.stringify(
        {
          url: page.url(),
          member: data.memberId,
          sample: true,
          simulatedEmailDelivery: true,
        },
        null,
        2,
      ),
    );
  } finally {
    await context.close();
  }
});
