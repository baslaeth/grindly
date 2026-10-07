import { test, expect } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { rankFixture } from "./rank-fixture";
import { fillUnknownContext, fillAssessment } from "./evaluation-helpers";
import { alphaCategories } from "../../src/alpha/model";
import { categoryFields } from "../../src/alpha/checklists";
import { evaluationCases } from "../fixtures/evaluation-cases";
import type { ResearchData } from "../../src/research/model";

test("all nine category forms save, share pending alpha and preserve source failure without AI", async ({
  browser,
  baseURL,
}, info) => {
  const author = await rankFixture(browser, baseURL!, info.project.use);
  const peer = await rankFixture(
    browser,
    baseURL!,
    info.project.use,
    false,
    "risk",
  );
  let stage = "migration";
  const page = await author.context.newPage();
  try {
    expect(
      author.data.evaluationAvailable,
      "Migration 026 approval/application required",
    ).toBe(true);
    const dir = `docs/evaluation-foundation/${info.project.name}`;
    await mkdir(dir, { recursive: true });
    await page.goto("/workbench");
    for (const category of alphaCategories) {
      stage = `submit:${category}`;
      await page
        .getByRole("link", { name: "Submit alpha", exact: true })
        .last()
        .click();
      await page
        .getByLabel("Contribution category", { exact: true })
        .selectOption(category);
      const example = evaluationCases.find((c) => c.category === category)!;
      await page
        .getByLabel("Contribution type", { exact: true })
        .selectOption(example.type);
      const context = page.getByRole("region", { name: "Category context" });
      await expect(context).toBeVisible();
      for (const field of categoryFields[category])
        await expect(
          page.getByLabel(`${field.label} answer`, { exact: true }),
        ).toBeVisible();
      await fillUnknownContext(page, category);
      const claim = `Isolated ${category} ${info.project.name} ${Date.now()}: ${example.claim}`;
      await page.getByLabel("Subject or project").fill(`Sample ${category}`);
      await page.getByLabel("What did you find or conclude?").fill(claim);
      await page
        .getByLabel("Why does it matter to members?")
        .fill(
          "A labeled synthetic submission exercises category context and pending sharing, not a real opportunity.",
        );
      await page
        .getByLabel("What did you personally discover, test, or add?")
        .fill(example.evidence);
      await page
        .getByLabel("What is uncertain or risky?")
        .fill(example.expected);
      await page
        .getByLabel("Links or transaction hashes (one per line)", {
          exact: true,
        })
        .fill("https://example.test/unavailable-synthetic-source");
      if (example.type === "prediction") {
        await page
          .getByLabel("Horizon or milestone (UTC)")
          .fill(new Date(Date.now() + 86400000).toISOString().slice(0, 16));
        await page
          .getByLabel(
            "What would count against the claim or establish the outcome?",
          )
          .fill(example.later);
      }
      if (category === "Project Analysts")
        await page.screenshot({
          path: `${dir}/category-editor.png`,
          fullPage: true,
        });
      await page.getByRole("checkbox").check();
      await page
        .getByRole("button", { name: "Submit for review", exact: true })
        .click();
      await expect(page.getByText(/^Alpha saved:/)).toBeVisible({
        timeout: 30000,
      });
      await page
        .getByRole("link", { name: "Review Assistant", exact: true })
        .click();
      await expect(
        page.getByRole("heading", { name: "Review Assistant", exact: true }),
      ).toBeInViewport();
      await expect(
        page.getByText(
          author.data.localAIEnabled
            ? "Optional local AI analysis is configured. Results require independent assessment."
            : "AI analysis is not connected yet.",
          { exact: true },
        ),
      ).toBeVisible();
      await page
        .getByRole("button", { name: "Refresh sources", exact: true })
        .click();
      await expect(
        page.getByRole("button", { name: "Refresh sources", exact: true }),
      ).toBeEnabled({ timeout: 30000 });
      const id = new URL(page.url()).pathname.split("/").at(-1)!;
      const s = (await (
        await peer.context.request.get("/api/research")
      ).json()) as ResearchData;
      const f = s.findings.find((f) => f.id === id)!;
      expect(f.status).toBe("pending");
      expect(
        s.alphas?.find((a) => a.version_id === f.current_version)?.category,
      ).toBe(category);
      expect(s.awards.some((a) => a.finding_id === id)).toBe(false);
      expect(
        s.preliminary?.some(
          (r) => r.version_id === f.current_version && r.card,
        ),
      ).toBe(false);
      await expect
        .poll(
          async () => {
            const s = (await (
              await author.context.request.get("/api/research")
            ).json()) as ResearchData;
            return s.sourceChecks?.find(
              (r) => r.version_id === f.current_version,
            )?.sources[0]?.status;
          },
          { timeout: 30000 },
        )
        .toBe("unknown");
      if (category === "Project Analysts")
        await page.screenshot({
          path: `${dir}/review-assistant.png`,
          fullPage: true,
        });
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await page
        .getByRole("link", { name: "Return to Hub", exact: true })
        .click();
    }
  } catch {
    await writeFile(
      info.outputPath("sanitized-evaluation-failure.json"),
      JSON.stringify({
        stage,
        finalURL: new URL(page.url()).pathname,
        classification: "assertion_or_request_failure",
      }),
    );
    throw new Error(
      `Evaluation foundation failed at ${stage}; no sessions or request payloads recorded`,
    );
  } finally {
    await author.context.close();
    await peer.context.close();
  }
});

test("independent rejection and appeal preserve reasons and cannot reuse the initial reviewer", async ({
  browser,
  baseURL,
}, info) => {
  const author = await rankFixture(browser, baseURL!, info.project.use);
  const peers = [
    await rankFixture(browser, baseURL!, info.project.use, false, "risk"),
    await rankFixture(browser, baseURL!, info.project.use, false, "operations"),
  ];
  const contexts = new Map(
    [author, ...peers].map((p) => [p.fixture.member, p.context]),
  );
  let stage = "open_submission";
  const page = await author.context.newPage();
  let inspection = page;
  try {
    expect(author.data.evaluationAvailable).toBe(true);
    await page.goto("/workbench?room=bronze-project-analysts");
    await page
      .getByRole("link", { name: "Submit alpha", exact: true })
      .last()
      .click();
    await page
      .getByLabel("Contribution category", { exact: true })
      .selectOption("Project Analysts");
    await fillUnknownContext(page, "Project Analysts");
    await page
      .getByLabel("Subject or project")
      .fill("Sample unsupported thesis");
    const claim = `Isolated appeal ${info.project.name} ${Date.now()}: issuer statements do not prove independent traction.`;
    await page.getByLabel("What did you find or conclude?").fill(claim);
    await page
      .getByLabel("Why does it matter to members?")
      .fill(
        "Distinguish a publisher statement from an independently observed product outcome.",
      );
    await page
      .getByLabel("What did you personally discover, test, or add?")
      .fill(
        "Synthetic assessment of a primary specification, not genuine research.",
      );
    await page
      .getByLabel("What is uncertain or risky?")
      .fill(
        "Independent adoption is Unknown; the source only documents an API.",
      );
    await page
      .getByLabel("Links or transaction hashes (one per line)", { exact: true })
      .fill(
        "https://docs.cdp.coinbase.com/api-reference/exchange-api/rest-api/products/get-product-candles.md",
      );
    await page.getByRole("checkbox").check();
    stage = "save_receipt";
    await page
      .getByRole("button", { name: "Submit for review", exact: true })
      .click();
    await expect(page.getByText(/^Alpha saved:/)).toBeVisible({
      timeout: 30000,
    });
    const id = new URL(page.url()).pathname.split("/").at(-1)!;
    const snapshot = async () =>
      (await (
        await author.context.request.get("/api/research")
      ).json()) as ResearchData;
    let s = await snapshot();
    stage = "review_assignment";
    const f = s.findings.find((f) => f.id === id)!;
    const assignment = s.assignments.find(
      (a) => a.version_id === f.current_version && !a.completed_at,
    )!;
    expect(assignment).toBeDefined();
    expect(assignment.reviewer_id).not.toBe(author.fixture.member);
    const reviewer = await contexts.get(assignment.reviewer_id)!.newPage();
    inspection = reviewer;
    stage = "review_form";
    await reviewer.goto("/review");
    const form = reviewer
      .locator("article.record")
      .filter({ hasText: claim })
      .filter({
        has: reviewer.getByRole("button", { name: "Record decision" }),
      });
    stage = `assessment_form_${await form.count()}_fields_${await form.getByLabel("Evidence and dated sources", { exact: true }).count()}`;
    await fillAssessment(form);
    await form.getByLabel("Decision", { exact: true }).selectOption("reject");
    await form
      .getByLabel("Reasons and scope limits")
      .fill(
        "Isolated rejection: the source does not establish independent adoption.",
      );
    await form
      .getByLabel("Conflicts disclosure")
      .fill("None in this isolated synthetic case");
    await form.getByRole("checkbox").check();
    await form.getByRole("button", { name: "Record decision" }).click();
    stage = "rejection_saved";
    await expect
      .poll(
        async () =>
          (await snapshot()).findings.find((f) => f.id === id)?.status,
        { timeout: 30000 },
      )
      .toBe("rejected");
    await page.reload();
    inspection = page;
    stage = "appeal_form";
    await page
      .getByText("Request an independent appeal", { exact: true })
      .click();
    stage = "appeal_saved";
    await page
      .getByLabel("Reason for independent appeal")
      .fill(
        "Isolated request for an independent second assessment of the bounded source interpretation.",
      );
    await page
      .getByRole("button", { name: "Request independent review", exact: true })
      .click();
    await expect
      .poll(
        async () =>
          (await snapshot()).findings.find((f) => f.id === id)?.status,
        { timeout: 30000 },
      )
      .toBe("disputed");
    s = await snapshot();
    const next = s.assignments.find(
      (a) => a.version_id === f.current_version && !a.completed_at,
    );
    if (next) {
      expect(next.reviewer_id).not.toBe(assignment.reviewer_id);
      expect(next.reviewer_id).not.toBe(author.fixture.member);
    }
    expect(s.awards.some((a) => a.finding_id === id)).toBe(false);
    expect(
      s.reviewAssessments?.some((r) =>
        s.decisions.some(
          (d) => d.id === r.decision_id && d.version_id === f.current_version,
        ),
      ),
    ).toBe(true);
  } catch (error) {
    await inspection
      .screenshot({
        path: info.outputPath("isolated-appeal-failure.png"),
        fullPage: false,
      })
      .catch(() => undefined);
    const diagnostics = await inspection
      .locator("main [role=alert]")
      .allTextContents()
      .catch(() => []);
    const invalid = await inspection
      .locator("main input:invalid, main textarea:invalid, main select:invalid")
      .evaluateAll((elements) =>
        elements.map((e) => ({
          name: e.getAttribute("name"),
          type: e.getAttribute("type"),
        })),
      )
      .catch(() => []);
    await writeFile(
      info.outputPath("sanitized-appeal-failure.json"),
      JSON.stringify({
        stage,
        path: new URL(page.url()).pathname,
        locatorFailure:
          error instanceof Error &&
          /^locator\.(fill|selectOption|check|click)/.test(error.message)
            ? error.message.split("\n")[0]?.slice(0, 240)
            : "assertion_or_request_failure",
        diagnostics,
        invalid,
      }),
    );
    throw new Error(
      `Isolated reject/appeal navigation failed at ${stage}; no request credentials recorded`,
    );
  } finally {
    for (const context of contexts.values()) await context.close();
  }
});
