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
    "Source checks",
    "What information is missing?",
    "Is there related earlier alpha?",
    "What happened after the declared horizon?",
    "Fresh AI analysis is not connected.",
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
  expect(html).toContain("No related earlier alpha found");
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

it("keeps saved analysis dated separately from newer source checks and a failed refresh", () => {
  const data = fixture();
  data.sourceChecks = [
    {
      id: "successful",
      version_id: "version",
      status: "complete",
      created_at: "2026-10-02T12:00:00Z",
      completed_at: "2026-10-02T12:00:01Z",
      sources: [],
      hints: [],
      checks: [],
    },
    {
      id: "failed",
      version_id: "version",
      status: "failed",
      created_at: "2026-10-03T12:00:00Z",
      completed_at: "2026-10-03T12:00:01Z",
      sources: [],
      hints: [],
      checks: [],
    },
  ] as ResearchData["sourceChecks"];
  data.preliminary = [
    {
      version_id: "version",
      status: "complete",
      created_at: "2026-10-01T12:00:00Z",
      completed_at: "2026-10-01T12:00:01Z",
      sources: [],
      checks: [],
    },
  ] as unknown as ResearchData["preliminary"];
  const html = renderToStaticMarkup(GrindIntelligence({ data }));
  expect(html).toContain("Saved, experimental");
  expect(html).toContain("Saved 2026-10-01 12:00:01 UTC");
  expect(html).toContain("Newer source checks have not been assessed");
  expect(html).toContain("Latest check failed");
  expect(html).toContain("Fresh AI analysis is not connected");
});

it.each(["running", "failed"])(
  "retains the completed model result during a %s attempt",
  (status) => {
    const data = fixture();
    data.localAIEnabled = true;
    data.preliminary = [
      {
        id: "new",
        version_id: "version",
        status,
        created_at: "2026-10-02T12:00:00Z",
        sources: [],
        checks: [],
      },
      {
        id: "saved",
        version_id: "version",
        status: "complete",
        created_at: "2026-10-01T12:00:00Z",
        completed_at: "2026-10-01T12:00:01Z",
        sources: [],
        checks: [],
      },
    ] as unknown as ResearchData["preliminary"];
    const html = renderToStaticMarkup(GrindIntelligence({ data }));
    expect(html).toContain("Saved 2026-10-01 12:00:01 UTC");
    expect(html).not.toContain("No completed AI analysis for this version");
    expect(html).toContain(
      status === "running"
        ? "Analysis is running"
        : "The latest analysis did not complete",
    );
    if (status === "running")
      expect(html).not.toContain("Run fresh local analysis");
  },
);
