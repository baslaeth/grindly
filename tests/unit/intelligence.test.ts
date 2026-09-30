import { expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { ResearchData } from "@/research/model";
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
import { GrindIntelligence } from "@/components/grind-intelligence";

function fixture(): ResearchData {
  return {
    memberId: "author",
    roles: [],
    profiles: [],
    assignments: [],
    decisions: [],
    findings: [
      {
        id: "alpha",
        current_version: "version",
        author_id: "author",
        status: "pending",
      },
    ],
    versions: [
      {
        id: "version",
        finding_id: "alpha",
        version: 1,
        claim: "Isolated evidence example",
        submitted_at: "2026-09-30T12:00:00Z",
      },
    ],
    alphas: [
      {
        version_id: "version",
        category: "Project Analysts",
        contribution_type: "analysis",
        details: {},
        created_at: "2026-09-30T12:00:00Z",
        horizon: null,
      },
    ],
    sourceChecks: [],
    evaluationAvailable: false,
  } as unknown as ResearchData;
}
it("renders useful empty answers without inventing checks or AI results", () => {
  const html = renderToStaticMarkup(GrindIntelligence({ data: fixture() }));
  for (const text of [
    "What sources were checked?",
    "What information is missing?",
    "Is there related earlier alpha?",
    "What happened after the declared horizon?",
    "AI analysis is not connected yet.",
    "No source observations saved yet",
    "Source refresh is temporarily unavailable",
    "No time-bound outcome declared",
    "Pending review",
  ])
    expect(html).toContain(text);
});
it("shows failed refresh honestly and omits inaccessible prior-work identifiers", () => {
  const data = fixture();
  data.sourceChecks = [
    {
      id: "run",
      version_id: "version",
      status: "failed",
      created_at: "2026-09-30T13:00:00Z",
      completed_at: "2026-09-30T13:00:01Z",
      sources: [],
      checks: [],
      hints: [
        { version: "hidden-version-identifier", signals: ["hidden-source"] },
      ],
    },
  ] as ResearchData["sourceChecks"];
  const html = renderToStaticMarkup(GrindIntelligence({ data }));
  expect(html).toContain("The latest source check could not finish");
  expect(html).not.toContain("hidden-version-identifier");
  expect(html).not.toContain("hidden-source");
  expect(html).toContain("No visible prior-work hints are recorded.");
});
it("an empty permitted snapshot has no actionable selector or fabricated example", () => {
  const data = fixture();
  data.findings = [];
  data.versions = [];
  data.alphas = [];
  const html = renderToStaticMarkup(GrindIntelligence({ data }));
  expect(html).toContain("No accessible alphas yet");
  expect(html).toContain("No permitted alphas yet");
  expect(html).toContain("disabled");
  expect(html).not.toContain("Isolated evidence example");
});
