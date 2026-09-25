import { test, expect, type BrowserContext } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { readFile } from "node:fs/promises";
import { setTimeout } from "node:timers/promises";
import type { ResearchData } from "../../src/research/model";
test("labeled specialists collaborate, correct, independently accept and receive credit", async ({
  browser,
  baseURL,
}, info) => {
  const fixtures = JSON.parse(
    await readFile(".local/research-fixtures.json", "utf8"),
  ) as { email: string; member: string; specialty: string }[];
  if (
    fixtures.length !== 3 ||
    fixtures.some(
      (f) =>
        !/^grindly-qa-research-(project|risk|operations)@example.test$/.test(
          f.email,
        ),
    )
  )
    throw new Error("Isolated QA identities required");
  const db = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    { auth: { persistSession: false } },
  );
  const contexts = new Map<string, BrowserContext>();
  try {
    for (const f of fixtures) {
      const c = await browser.newContext({
        ...info.project.use,
        baseURL,
        extraHTTPHeaders: { Origin: baseURL! },
      });
      contexts.set(f.member, c);
      expect(
        (
          await c.request.post("/api/auth/otp", {
            data: { mode: "returning", email: f.email },
          })
        ).ok(),
      ).toBe(true);
      await setTimeout(1500);
      const otp = await db.auth.admin.generateLink({
        type: "magiclink",
        email: f.email,
      });
      if (otp.error) throw new Error("Fixture OTP generation failed");
      expect(
        (
          await c.request.post("/api/auth/verify", {
            data: { code: otp.data.properties.email_otp },
          })
        ).ok(),
      ).toBe(true);
    }
    const author = fixtures[0]!;
    const operator = fixtures[2]!;
    const authorContext = contexts.get(author.member)!;
    const snapshot = async (context = authorContext): Promise<ResearchData> => {
      const r = await context.request.get("/api/research");
      expect(r.ok()).toBe(true);
      return r.json();
    };
    const mutate = async (context: BrowserContext, data: unknown) => {
      const r = await context.request.post("/api/research", { data });
      expect(r.ok(), JSON.stringify(await r.json())).toBe(true);
      return r.json();
    };
    const before = await snapshot();
    const priorXP = before.awards.reduce((n, a) => n + a.xp, 0);
    const tag = `DEMO QA ${info.project.name} ${Date.now()}`;
    const message = await mutate(contexts.get(operator.member)!, {
      action: "message",
      body: `${tag}: Which prerequisites are supported, and which are assumptions?`,
      sources: [
        {
          label: "Robinhood Chain docs",
          url: "https://docs.robinhood.com/chain/",
        },
      ],
      reply: null,
    });
    const page = await authorContext.newPage();
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto("/workbench");
    const thread = page.locator(`#message-${message.id}`);
    await expect(thread).toContainText("Illustrative QA persona");
    await thread.locator("summary").click();
    await thread
      .getByLabel("Your reply")
      .fill(
        `${tag}: I can separate documented dependencies from untested assumptions.`,
      );
    await thread.getByRole("button", { name: "Reply", exact: true }).click();
    await expect(thread.getByRole("status")).toHaveText("Saved.");
    await thread.getByRole("link", { name: "Develop a finding" }).click();
    await expect(page).toHaveURL(
      new RegExp(`/findings/new\\?message=${message.id}`),
    );
    await page
      .getByLabel("Main claim", { exact: true })
      .fill(`${tag}: Documented dependencies need a bounded test checklist.`);
    await page
      .getByLabel("Evidence URLs (one per line)", { exact: true })
      .fill("https://docs.robinhood.com/chain/");
    await page
      .getByLabel("What you added", { exact: true })
      .fill(
        "DEMO QA: separated documented dependencies, a reproducible checklist and unresolved assumptions. Synthetic assessment, not real protocol research.",
      );
    await page
      .getByLabel("Important limitations", { exact: true })
      .fill(
        "DEMO QA only. No real audit, reward eligibility or investment outcome is claimed.",
      );
    await page
      .getByLabel("Observation time (your local time)")
      .fill("2026-09-24T12:00");
    await page.getByRole("checkbox").check();
    await page
      .getByRole("button", { name: "Submit for review", exact: true })
      .click();
    await expect(page).toHaveURL(/\/findings\/[a-f0-9-]{36}$/, {
      timeout: 30000,
    });
    const findingId = page.url().split("/").at(-1)!;
    let s = await snapshot();
    let f = s.findings.find((f) => f.id === findingId)!;
    expect(
      s.versions.find((v) => v.id === f.current_version)?.source_message,
    ).toBe(message.id);
    expect(s.messages.find((m) => m.id === message.id)?.author_id).toBe(
      operator.member,
    );
    expect(f.author_id).toBe(author.member);
    let assignment = s.assignments.find(
      (a) => a.version_id === f.current_version && !a.completed_at,
    )!;
    const reviewerPage = await contexts.get(assignment.reviewer_id)!.newPage();
    await reviewerPage.goto("/review");
    let review = reviewerPage
      .locator("article.record")
      .filter({ hasText: tag })
      .filter({
        has: reviewerPage.getByRole("button", { name: "Record decision" }),
      });
    await review.getByLabel("Decision").selectOption("correct");
    await review
      .getByLabel("Reasons and scope limits")
      .fill(
        "DEMO QA: explicitly distinguish the source discussion from your added checklist.",
      );
    await review
      .getByLabel("Conflicts disclosure")
      .fill("None within this labeled synthetic QA scenario.");
    await review.getByRole("checkbox").check();
    await review.getByRole("button", { name: "Record decision" }).click();
    await expect
      .poll(
        async () =>
          (await snapshot()).findings.find((f) => f.id === findingId)?.status,
        { timeout: 30000 },
      )
      .toBe("needs_correction");
    await page.reload();
    await page.getByRole("link", { name: "Submit a correction" }).click();
    await page
      .getByLabel("What this correction changes")
      .fill(
        "DEMO QA: clarified that the source message raised the question; my addition is the checklist.",
      );
    await page
      .getByLabel("Observation time (your local time)")
      .fill("2026-09-24T12:05");
    await page.getByRole("checkbox").check();
    await page
      .getByRole("button", { name: "Submit corrected version" })
      .click();
    await expect(page).toHaveURL(new RegExp(`/findings/${findingId}$`), {
      timeout: 30000,
    });
    s = await snapshot();
    f = s.findings.find((f) => f.id === findingId)!;
    assignment = s.assignments.find(
      (a) => a.version_id === f.current_version && !a.completed_at,
    )!;
    expect(assignment.reviewer_id).not.toBe(author.member);
    await reviewerPage.reload();
    review = reviewerPage
      .locator("article.record")
      .filter({ hasText: tag })
      .filter({
        has: reviewerPage.getByRole("button", { name: "Record decision" }),
      });
    await review
      .getByLabel("Reasons and scope limits")
      .fill(
        "DEMO QA: accepted exact corrected version for synthetic source-lineage and limitation coverage only.",
      );
    await review
      .getByLabel("Conflicts disclosure")
      .fill("None within this labeled synthetic QA scenario.");
    await review.getByRole("checkbox").check();
    await review.getByRole("button", { name: "Record decision" }).click();
    await expect
      .poll(
        async () =>
          (await snapshot()).findings.find((f) => f.id === findingId)?.status,
        { timeout: 30000 },
      )
      .toBe("accepted");
    const repeated = await Promise.all(
      Array.from({ length: 3 }, () =>
        mutate(contexts.get(assignment.reviewer_id)!, {
          action: "review",
          version: f.current_version,
          assignment: assignment.id,
          decision: "accept",
          reason: "DEMO QA repeated acceptance request",
          conflicts: "None in fixture",
          conflictFree: true,
        }),
      ),
    );
    expect(repeated).toHaveLength(3);
    await mutate(contexts.get(operator.member)!, {
      action: "useful",
      version: f.current_version,
      detail: `${tag}: used the dependency boundary to narrow an operations checklist; synthetic example only.`,
    });
    s = await snapshot();
    expect(s.awards.reduce((n, a) => n + a.xp, 0)).toBe(priorXP + 25);
    expect(s.awards.filter((a) => a.finding_id === findingId)).toHaveLength(1);
    expect(s.versions.filter((v) => v.finding_id === findingId)).toHaveLength(
      2,
    );
    await page.goto("/workbench");
    const brief = page.getByRole("region", {
      name: "Grind Intelligence evidence brief",
    });
    await expect(brief).toContainText(tag);
    await expect(brief).toContainText("synthetic example only");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: info.outputPath("workbench.png"),
      fullPage: true,
    });
    await page.goto("/membership");
    await expect(
      page
        .locator(".metrics div")
        .filter({ hasText: "Lifetime XP" })
        .locator("dd"),
    ).toHaveText(String(priorXP + 25));
    await page.screenshot({
      path: info.outputPath("membership.png"),
      fullPage: true,
    });
    expect(errors).toEqual([]);
    console.log(
      `${info.project.name}: discussion -> v1 correction -> v2 acceptance -> one award -> usefulness -> brief; finding ${findingId}`,
    );
  } finally {
    for (const context of contexts.values())
      await context.close().catch(() => undefined);
  }
});
