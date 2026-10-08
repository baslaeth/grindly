import { expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { formAliases, submissionTypes } from "@/launch/form-aliases";
import { launchFields } from "@/launch/forms";
import { AlphaSummary } from "@/components/alpha-summary";
import { ReviewDesk } from "@/components/research-views";
import type { ResearchData } from "@/research/model";
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
}));

it("keeps new-post choices separate from version actions without removing legacy types", () => {
  expect(submissionTypes(false)).toEqual([
    "find",
    "guide",
    "warning",
    "prediction",
  ]);
  expect(submissionTypes(true)).toEqual(["correction", "update"]);
});
it("only aliases known category fields and preserves distinct historical answers", () => {
  for (const category of Object.keys(
    launchFields,
  ) as (keyof typeof launchFields)[]) {
    const aliases = formAliases(category);
    for (const key of Object.keys(aliases))
      expect(launchFields[category].some((f) => f.key === key)).toBe(true);
    for (const [key, field] of Object.entries(aliases)) {
      expect(
        formAliases(
          category,
          { [key]: "Earlier exact context" },
          { [field]: "Different new answer" },
        )[key],
      ).toBeUndefined();
      expect(
        formAliases(category, { [key]: "Same" }, { [field]: "Same" })[key],
      ).toBe(field);
    }
  }
});
function fixture(): ResearchData {
  return {
    memberId: "author",
    roles: [],
    assignments: [],
    decisions: [],
    profiles: [
      { member_id: "author", display_name: "Sample author", is_demo: true },
    ],
    findings: [
      {
        id: "finding",
        author_id: "author",
        current_version: "version",
        status: "needs_correction",
        visibility: "members",
      },
    ],
    versions: [
      {
        id: "version",
        finding_id: "finding",
        claim: "Only signed tasks count",
        addition: "Reviewed the official source",
        limitations: "Points do not guarantee tokens.",
      },
    ],
    alphas: [
      {
        version_id: "version",
        subject: "Axis",
        category: "Airdrop Hunters",
        contribution_type: "guide",
        purpose: "Reduce wasted tasks",
      },
    ],
    airdropGuides: [
      {
        version_id: "version",
        details: {
          confirmed: "Published signing rule",
          steps: "Inspect the task before signing",
          prerequisites: "A compatible wallet",
          speculative: "Personal eligibility is unknown.",
          exclusions: "Unsigned tasks excluded",
          testEvidence: "Documentation only",
          stage: "Points program",
        },
      },
    ],
  } as unknown as ResearchData;
}
it("puts full guide steps, prerequisites and unabridged risks in the contribution", () => {
  const html = renderToStaticMarkup(
    createElement(AlphaSummary, { data: fixture(), version: "version" }),
  );
  for (const value of [
    "Published signing rule",
    "Inspect the task before signing",
    "A compatible wallet",
    "Points do not guarantee tokens.",
    "Personal eligibility is unknown.",
    "Unsigned tasks excluded",
  ])
    expect(html).toContain(value);
});
it("identifies previews as samples and links to the unchanged record", () => {
  const html = renderToStaticMarkup(
    createElement(AlphaSummary, {
      data: fixture(),
      version: "version",
      preview: true,
    }),
  );
  expect(html).toContain('href="/findings/finding"');
  expect(html).toContain('class="sample-label">Sample');
  expect(html).toContain("Points do not guarantee tokens.");
});
it("gives ordinary members their review status and correction action, not administrative tools", () => {
  const html = renderToStaticMarkup(
    createElement(ReviewDesk, { data: fixture() }),
  );
  expect(html).toContain("Your submissions");
  expect(html).toContain("Your correction is needed");
  expect(html).toContain("/findings/new?revise=version");
  for (const text of [
    "Your assigned reviews",
    "Manage the review queue",
    "Operator tools",
    "Review authority required",
    "Due outcomes",
  ])
    expect(html).not.toContain(text);
});
