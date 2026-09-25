import { z } from "zod";
const id = z.uuid();
const specialty = z.enum(["operations", "project", "risk"]);
const text = (min: number, max: number) => z.string().trim().min(min).max(max);
const source = z
  .object({
    label: text(1, 120),
    url: z
      .url()
      .max(500)
      .refine(
        (url) => /^https?:\/\//i.test(url),
        "Use an HTTP or HTTPS source",
      ),
  })
  .strict();
export const researchInput = z.discriminatedUnion("action", [
  z
    .object({
      action: z.literal("promote"),
      member: id,
      reason: text(20, 1500),
    })
    .strict(),
  z
    .object({ action: z.literal("profile"), name: text(2, 60), specialty })
    .strict(),
  z
    .object({
      action: z.literal("message"),
      body: text(1, 2000),
      sources: z.array(source).max(8),
      reply: id.nullable(),
    })
    .strict(),
  z
    .object({
      action: z.literal("submit"),
      finding: id.nullable(),
      previous: id.nullable(),
      visibility: z.enum(["members", "reviewers"]),
      specialty,
      claim: text(10, 1000),
      sources: z.array(source).min(1).max(8),
      addition: text(10, 2000),
      limitations: text(5, 1000),
      sourceMessage: id.nullable(),
      relatedVersion: id.nullable(),
      correction: text(10, 1000).nullable(),
      observedAt: z.iso
        .datetime({ offset: true })
        .refine(
          (v) => Date.parse(v) <= Date.now() + 60000,
          "Observation cannot be in the future",
        ),
    })
    .strict(),
  z
    .object({
      action: z.literal("review"),
      version: id,
      assignment: id,
      decision: z.enum(["accept", "correct"]),
      reason: text(10, 1500),
      conflicts: text(4, 500),
      conflictFree: z.literal(true),
    })
    .strict(),
  z
    .object({
      action: z.literal("useful"),
      version: id,
      detail: text(10, 1000),
    })
    .strict(),
  z
    .object({
      action: z.literal("dispute"),
      version: id,
      reason: text(10, 1500),
    })
    .strict(),
  z.object({ action: z.literal("assign"), version: id }).strict(),
  z.object({ action: z.literal("claimAssignment") }).strict(),
  z.object({ action: z.literal("deliverAssignment"), version: id }).strict(),
  z
    .object({
      action: z.literal("peerRequest"),
      specialty,
      request: text(10, 1000),
    })
    .strict(),
]);
export type ResearchInput = z.infer<typeof researchInput>;
