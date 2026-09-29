import { expect, it } from "vitest";
import { alphaCategories } from "@/alpha/model";
import { reviewChecklist } from "@/alpha/checklists";
import {
  evaluationCases,
  explicitUnknownContext,
} from "../fixtures/evaluation-cases";
it("covers every category and preserves held-out semantic cases without claiming model accuracy", () => {
  expect(new Set(evaluationCases.map((c) => c.category))).toEqual(
    new Set(alphaCategories),
  );
  expect(evaluationCases.filter((c) => c.split === "held-out")).toHaveLength(2);
  expect(new Set(evaluationCases.map((c) => c.type)).size).toBe(6);
  for (const c of evaluationCases) {
    expect(c.expected.length).toBeGreaterThan(50);
    expect(c.evidence).not.toBe("");
    expect(c.later).not.toBe("");
    expect(
      reviewChecklist(c.category, c.type).questions.length,
    ).toBeGreaterThan(5);
    expect(
      Object.keys(explicitUnknownContext(c.category)).length,
    ).toBeGreaterThan(2);
  }
});
