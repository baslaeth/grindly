import "server-only";
import { z } from "zod";
import {
  alphaSubmission,
  alphaCategories,
  outcomeAssessment,
  type CheckedSource,
  type AlphaVersion,
} from "@/alpha/model";
import { deterministicChecks, type ReviewContext } from "@/alpha/checks";
import { requireActiveMembership } from "../membership/access";
import { createDataClient } from "../supabase";
import { privateResult } from "../chat/service";
import { type Json } from "@/types/database";
import { collectSources } from "./sources";
import { reportFailure } from "../diagnostics";
import { ServiceError } from "../errors";
import { checklistVersion } from "@/alpha/checklists";
export const alphaAction = z.union([
  alphaSubmission,
  outcomeAssessment,
  z
    .object({
      action: z.literal("focusProfile"),
      name: z.string().trim().min(2).max(60),
      bio: z.string().trim().max(300),
      focus: z.enum(alphaCategories),
    })
    .strict(),
  z.object({ action: z.literal("refreshSources"), version: z.uuid() }).strict(),
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
      checklist: z.literal(checklistVersion),
      assessment: z
        .object({
          evidence: z.string().trim().min(10).max(600),
          relevance: z.string().trim().min(10).max(600),
          addition: z.string().trim().min(10).max(600),
          limitations: z.string().trim().min(10).max(600),
          alternatives: z.string().trim().min(10).max(600),
        })
        .strict(),
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
    await db.rpc("alpha_begin_sources", {
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
    sources = await collectSources(context.alpha);
    const result = deterministicChecks(context, sources);
    checks = result.checks;
    // Source refresh never invokes a paid model, even if a key later appears.
    const saved = await createDataClient().rpc("alpha_finish_sources", {
      p_run: context.run,
      p_status: "complete",
      p_sources: sources as unknown as Json,
      p_checks: checks,
      p_hints: result.candidates
        .filter((c) => c.signals.length)
        .map((c) => ({ version: c.id, signals: c.signals })),
    });
    if (saved.error) throw saved.error;
  } catch {
    const result = await createDataClient().rpc("alpha_finish_sources", {
      p_run: context.run,
      p_status: "failed",
      p_sources: sources as unknown as Json,
      p_checks: checks,
      p_hints: [],
    });
    if (result.error)
      reportFailure(
        "alpha.persist",
        new Error("Preliminary review persistence failed"),
      );
    reportFailure("alpha.sources", new Error("Source check unavailable"));
  }
}
export async function alphaMutation(input: z.infer<typeof alphaAction>) {
  const active = await requireActiveMembership(true);
  const db = createDataClient();
  if (input.action === "focusProfile")
    return privateResult(
      await db.rpc("alpha_focus_profile", {
        p_member: active.member.id,
        p_binding: active.binding.id,
        p_name: input.name,
        p_bio: input.bio,
        p_focus: input.focus,
      }),
    );
  if (input.action === "outcomeAssess") {
    const { action: _action, request, version, ...data } = input;
    void _action;
    return privateResult(
      await db.rpc("alpha_assess_outcome", {
        p_member: active.member.id,
        p_binding: active.binding.id,
        p_version: version,
        p_request: request,
        p_data: data as unknown as Json,
      }),
    );
  }
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
      await db.rpc("alpha_submit_v2", {
        p_member: active.member.id,
        p_binding: active.binding.id,
        p_request: request,
        p_data: data as unknown as Json,
      }),
    ) as { id: string; version: string };
  }
  if (input.action === "review")
    return privateResult(
      await db.rpc("alpha_decide_v2", {
        p_member: active.member.id,
        p_binding: active.binding.id,
        p_version: input.version,
        p_assignment: input.assignment,
        p_decision: input.decision,
        p_reason: input.reason,
        p_conflicts: input.conflicts,
        p_conflict_free: input.conflictFree,
        p_checklist: input.checklist,
        p_assessment: input.assessment,
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
