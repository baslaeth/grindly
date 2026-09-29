import "server-only";
import { z } from "zod";
import {
  alphaSubmission,
  type CheckedSource,
  type AlphaVersion,
} from "@/alpha/model";
import { deterministicChecks, type ReviewContext } from "@/alpha/checks";
import { requireActiveMembership } from "../membership/access";
import { createDataClient } from "../supabase";
import { privateResult } from "../chat/service";
import { type Json } from "@/types/database";
import { collectSources } from "./sources";
import {
  modelReview,
  PreliminaryError,
  assertReviewApproval,
} from "./provider";
import { reportFailure } from "../diagnostics";
import { ServiceError } from "../errors";
export const alphaAction = z.union([
  alphaSubmission,
  z.object({ action: z.literal("preliminary"), version: z.uuid() }).strict(),
  z.object({ action: z.literal("outcomeCheck"), version: z.uuid() }).strict(),
  z
    .object({
      action: z.literal("feedback"),
      version: z.uuid(),
      request: z.uuid(),
      kind: z.enum(["correction", "challenge", "useful"]),
      detail: z.string().trim().min(10).max(1500),
      source: z
        .url()
        .max(500)
        .refine((s) => s.startsWith("https://")),
    })
    .strict(),
  z
    .object({
      action: z.literal("appeal"),
      version: z.uuid(),
      reason: z.string().trim().min(10).max(1500),
    })
    .strict(),
  z
    .object({
      action: z.literal("review"),
      version: z.uuid(),
      assignment: z.uuid(),
      decision: z.enum(["accept", "correct", "reject"]),
      reason: z.string().trim().min(10).max(1500),
      conflicts: z.string().trim().min(4).max(500),
      conflictFree: z.literal(true),
    })
    .strict(),
]);
export async function preparePreliminary(version: string) {
  const active = await requireActiveMembership(true);
  const db = createDataClient();
  const finding = privateResult(
    await db.rpc("alpha_version_guard", {
      p_member: active.member.id,
      p_binding: active.binding.id,
      p_version: version,
    }),
  ) as { author_id: string };
  if (finding.author_id !== active.member.id) {
    const assignment = await db
      .from("review_assignments")
      .select("scope")
      .eq("version_id", version)
      .eq("reviewer_id", active.member.id)
      .is("completed_at", null)
      .maybeSingle();
    if (assignment.error) throw assignment.error;
    const authorized =
      assignment.data &&
      privateResult(
        await db.rpc("alpha_authorized_reviewer", {
          p_member: active.member.id,
          p_version: version,
          p_scope: assignment.data.scope,
        }),
      );
    if (!authorized)
      throw new ServiceError(
        "REVIEW_AUTHORITY_REQUIRED",
        "An authorized assigned reviewer is required.",
        403,
      );
  }
  return privateResult(
    await db.rpc("alpha_begin_review", {
      p_member: active.member.id,
      p_binding: active.binding.id,
      p_version: version,
    }),
  ) as unknown as ReviewContext;
}
export async function executePreliminary(context: ReviewContext) {
  if (context.existing) return;
  let sources: CheckedSource[] = [];
  let checks: string[] = deterministicChecks(context, []).checks;
  try {
    // No private-content transmission until server-side owner approval is configured.
    assertReviewApproval(context.isDemo);
    sources = await collectSources(context.alpha);
    checks = deterministicChecks(context, sources).checks;
    const result = await modelReview(context, sources);
    const saved = await createDataClient().rpc("alpha_finish_review", {
      p_id: context.run,
      p_status: "complete",
      p_provider: "openai",
      p_model: result.model,
      p_card: result.card as unknown as Json,
      p_sources: sources as unknown as Json,
      p_checks: checks,
      p_error: undefined,
    });
    if (saved.error) throw saved.error;
  } catch (e) {
    const code = e instanceof PreliminaryError ? e.code : "provider_failed";
    const result = await createDataClient().rpc("alpha_finish_review", {
      p_id: context.run,
      p_status: code.startsWith("provider_not_") ? "blocked" : "failed",
      p_provider: undefined,
      p_model: undefined,
      p_card: undefined,
      p_sources: sources as unknown as Json,
      p_checks: checks,
      p_error: code,
    });
    if (result.error)
      reportFailure(
        "alpha.persist",
        new Error("Preliminary review persistence failed"),
      );
    reportFailure("alpha.preliminary", new Error(code));
  }
}
export async function alphaMutation(input: z.infer<typeof alphaAction>) {
  const active = await requireActiveMembership(true);
  const db = createDataClient();
  if (input.action === "feedback")
    return privateResult(
      await db.rpc("alpha_add_feedback", {
        p_member: active.member.id,
        p_binding: active.binding.id,
        p_version: input.version,
        p_request: input.request,
        p_kind: input.kind,
        p_detail: input.detail,
        p_source: input.source,
      }),
    );
  if (input.action === "appeal")
    return privateResult(
      await db.rpc("alpha_appeal", {
        p_member: active.member.id,
        p_binding: active.binding.id,
        p_version: input.version,
        p_reason: input.reason,
      }),
    );
  if (input.action === "submit") {
    const { request, ...data } = input;
    return privateResult(
      await db.rpc("alpha_submit", {
        p_member: active.member.id,
        p_binding: active.binding.id,
        p_request: request,
        p_data: data as unknown as Json,
      }),
    ) as { id: string; version: string };
  }
  if (input.action === "review")
    return privateResult(
      await db.rpc("alpha_decide", {
        p_member: active.member.id,
        p_binding: active.binding.id,
        p_version: input.version,
        p_assignment: input.assignment,
        p_decision: input.decision,
        p_reason: input.reason,
        p_conflicts: input.conflicts,
        p_conflict_free: input.conflictFree,
      }),
    );
  if (input.action === "outcomeCheck") {
    privateResult(
      await db.rpc("alpha_version_guard", {
        p_member: active.member.id,
        p_binding: active.binding.id,
        p_version: input.version,
      }),
    );
    const av = await db
      .from("alpha_versions")
      .select("*")
      .eq("version_id", input.version)
      .single();
    if (av.error) throw av.error;
    if (!av.data.horizon || Date.parse(av.data.horizon) > Date.now())
      return {
        pending: true,
        message: "Outcome pending: the declared horizon has not arrived.",
      };
    const sources = await collectSources(av.data as unknown as AlphaVersion);
    return privateResult(
      await db.rpc("alpha_record_outcome", {
        p_member: active.member.id,
        p_binding: active.binding.id,
        p_version: input.version,
        p_status: sources.some((s) => s.status === "retrieved")
          ? "inconclusive"
          : "pending",
        p_facts:
          "Due-time sources checked. An independent reviewer must compare the observed facts with the original check condition; no successful outcome is inferred.",
        p_sources: sources as unknown as Json,
      }),
    );
  }
  throw new Error("Use prepared preliminary operation");
}
