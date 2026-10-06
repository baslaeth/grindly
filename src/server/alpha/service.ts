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
import { collectSources, marketHistorySource, primaryUrl } from "./sources";
import { supportsCoinbaseSpot, verifyCoinbasePath } from "@/launch/settlement";
import { reportFailure } from "../diagnostics";
import { ServiceError } from "../errors";
import { checklistVersion } from "@/alpha/checklists";
import { localModelConfiguration } from "./local-model";
import { modelReview, PreliminaryError } from "./provider";
import { airdropAlertTypes } from "@/alpha/airdrop-events";
export const alphaAction = z.union([
  alphaSubmission,
  outcomeAssessment,
  z
    .object({
      action: z.literal("airdropPreferences"),
      follow: z.uuid(),
      types: z.array(z.enum(airdropAlertTypes)).max(5),
      paused: z.boolean(),
    })
    .strict(),
  z
    .object({
      action: z.literal("airdropConfirm"),
      event: z.uuid(),
      confirm: z.boolean(),
    })
    .strict(),
  z
    .object({
      action: z.literal("airdropNotification"),
      id: z.uuid(),
      operation: z.enum(["acknowledge", "done"]),
    })
    .strict(),
  z
    .object({
      action: z.literal("appointReviewer"),
      candidate: z.uuid(),
      category: z.enum(alphaCategories),
      scope: z.string().trim().min(10).max(500),
      grant: z.boolean(),
    })
    .strict(),
  z
    .object({
      action: z.literal("follow"),
      kind: z.enum(["alpha", "opportunity"]),
      id: z.uuid(),
      operation: z.enum([
        "follow",
        "participated",
        "update",
        "remove",
        "acknowledge",
        "done",
      ]),
      note: z.string().max(500),
      nextAction: z.string().max(500),
      deadline: z.iso.datetime({ offset: true }).nullable(),
    })
    .strict(),
  z
    .object({
      action: z.literal("notification"),
      id: z.uuid(),
      operation: z.enum(["acknowledge", "done"]),
    })
    .strict(),
  z
    .object({
      action: z.literal("watchPreferences"),
      reminders: z.boolean(),
      digest: z.boolean(),
    })
    .strict(),
  z
    .object({
      action: z.literal("monitorConfigure"),
      opportunity: z.uuid(),
      kind: z.enum(["opportunity", "alpha"]).default("opportunity"),
      url: z.url().max(500),
      cadenceHours: z.number().int().min(24).max(168),
      enabled: z.boolean(),
    })
    .strict(),
  z
    .object({
      action: z.literal("monitorConfirm"),
      id: z.uuid(),
      confirmed: z.boolean(),
      change: z.string().trim().max(500),
      nextAction: z.string().trim().max(500),
      deadline: z.iso.datetime({ offset: true }).nullable(),
      priority: z.enum(["urgent", "nonurgent"]),
    })
    .strict(),
  z
    .object({
      action: z.literal("reverseWork"),
      award: z.uuid(),
      reason: z.string().trim().min(20).max(1500),
      source: z
        .url()
        .max(500)
        .refine((url) => url.startsWith("https://")),
    })
    .strict(),
  z
    .object({
      action: z.literal("focusProfile"),
      name: z.string().trim().min(2).max(60),
      bio: z.string().trim().max(300),
      focus: z.enum(alphaCategories),
    })
    .strict(),
  z.object({ action: z.literal("refreshSources"), version: z.uuid() }).strict(),
  z.object({ action: z.literal("localReview"), version: z.uuid() }).strict(),
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
      workClass: z
        .enum(["none", "actionable", "tested", "substantial"])
        .optional(),
      version: z.uuid(),
      assignment: z.uuid(),
      decision: z.enum(["accept", "correct", "reject"]),
      reason: z.string().trim().min(10).max(1500),
      conflicts: z.string().trim().min(4).max(500),
      conflictFree: z.literal(true),
    })
    .strict(),
]);
export async function preparePreliminary(version: string, local = false) {
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
  if (local) {
    const profile = await db
      .from("research_profiles")
      .select("is_demo")
      .eq("member_id", finding.author_id)
      .single();
    if (profile.error) throw profile.error;
    localModelConfiguration(profile.data.is_demo);
  }
  const context = privateResult(
    await db.rpc(local ? "alpha_begin_review" : "alpha_begin_sources", {
      p_member: active.member.id,
      p_binding: active.binding.id,
      p_version: version,
    }),
  ) as unknown as ReviewContext;
  if (context.existing) return context;
  if (local)
    Object.assign(
      context,
      privateResult(
        await db.rpc("alpha_source_context", {
          p_member: active.member.id,
          p_binding: active.binding.id,
          p_version: version,
        }),
      ),
    );
  const terms = await db
    .from("launch_submission_terms")
    .select("context")
    .eq("version_id", version)
    .maybeSingle();
  if (terms.error) throw terms.error;
  context.launchContext = (terms.data?.context ?? {}) as Record<string, string>;
  context.reviewedAt = new Date().toISOString();
  const guide = await db
    .from("airdrop_guides")
    .select("details")
    .eq("version_id", version)
    .maybeSingle();
  if (guide.error && guide.error.code !== "PGRST205") throw guide.error;
  context.airdropGuide = guide.data
    ?.details as unknown as ReviewContext["airdropGuide"];
  return context;
}
export async function executeLocalReview(context: ReviewContext) {
  if (context.existing) return;
  const configuration = localModelConfiguration(context.isDemo);
  let sources: CheckedSource[] = [];
  try {
    sources = await collectSources(
      context.alpha,
      JSON.stringify(context.airdropGuide ?? {}),
    );
    const result = await modelReview(context, sources, configuration);
    const saved = await createDataClient().rpc("alpha_finish_review", {
      p_id: context.run,
      p_status: "complete",
      p_provider: "ollama-local",
      p_model: result.model,
      p_card: result.card as unknown as Json,
      p_sources: sources as unknown as Json,
      p_checks: result.checks,
    });
    if (saved.error) throw saved.error;
  } catch (e) {
    const saved = await createDataClient().rpc("alpha_finish_review", {
      p_id: context.run,
      p_status: "failed",
      p_provider: "ollama-local",
      p_model: configuration.model,
      p_sources: sources as unknown as Json,
      p_error: e instanceof PreliminaryError ? e.code : "provider_failed",
    });
    if (saved.error)
      reportFailure(
        "alpha.persist",
        new Error("Local analysis persistence unavailable"),
      );
  }
}
export async function executePreliminary(context: ReviewContext) {
  if (context.existing) return;
  let sources: CheckedSource[] = [];
  let checks: string[] = deterministicChecks(context, []).checks;
  try {
    sources = await collectSources(
      context.alpha,
      JSON.stringify(context.airdropGuide ?? {}),
    );
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
  if (input.action === "airdropPreferences")
    return privateResult(
      await db.rpc("airdrop_preferences", {
        p_member: active.member.id,
        p_binding: active.binding.id,
        p_follow: input.follow,
        p_types: input.types,
        p_paused: input.paused,
      }),
    );
  if (input.action === "airdropConfirm")
    return privateResult(
      await db.rpc("airdrop_confirm", {
        p_actor: active.member.id,
        p_binding: active.binding.id,
        p_event: input.event,
        p_confirm: input.confirm,
      }),
    );
  if (input.action === "airdropNotification")
    return privateResult(
      await db.rpc("airdrop_notification_action", {
        p_member: active.member.id,
        p_binding: active.binding.id,
        p_id: input.id,
        p_action: input.operation,
      }),
    );
  if (input.action === "reverseWork")
    return privateResult(
      await db.rpc("launch_reverse_work", {
        p_member: active.member.id,
        p_binding: active.binding.id,
        p_award: input.award,
        p_reason: input.reason,
        p_evidence: [{ url: input.source }],
      }),
    );
  if (input.action === "appointReviewer")
    return privateResult(
      await db.rpc("launch_set_reviewer", {
        p_actor: active.member.id,
        p_binding: active.binding.id,
        p_candidate: input.candidate,
        p_category: input.category,
        p_scope: input.scope,
        p_grant: input.grant,
      }),
    );
  if (input.action === "follow")
    return privateResult(
      await db.rpc("launch_follow_mutate", {
        p_member: active.member.id,
        p_binding: active.binding.id,
        p_kind: input.kind,
        p_id: input.id,
        p_action: input.operation,
        p_note: input.note,
        p_next: input.nextAction,
        p_deadline: input.deadline ?? undefined,
      }),
    );
  if (input.action === "notification")
    return privateResult(
      await db.rpc("launch_notification_mutate", {
        p_member: active.member.id,
        p_binding: active.binding.id,
        p_id: input.id,
        p_action: input.operation,
      }),
    );
  if (input.action === "watchPreferences")
    return privateResult(
      await db.rpc("launch_watch_preferences_set", {
        p_member: active.member.id,
        p_binding: active.binding.id,
        p_reminders: input.reminders,
        p_digest: input.digest,
      }),
    );
  if (input.action === "monitorConfigure") {
    if (!primaryUrl(input.url))
      throw new ServiceError(
        "SOURCE_UNSUPPORTED",
        "Use a supported official public document without query parameters.",
        400,
      );
    if (input.kind === "alpha")
      return privateResult(
        await db.rpc("launch_set_alpha_monitor_source", {
          p_actor: active.member.id,
          p_binding: active.binding.id,
          p_finding: input.opportunity,
          p_url: input.url,
          p_cadence: input.cadenceHours,
          p_enabled: input.enabled,
        }),
      );
    return privateResult(
      await db.rpc("launch_set_monitor_source", {
        p_actor: active.member.id,
        p_binding: active.binding.id,
        p_opportunity: input.opportunity,
        p_url: input.url,
        p_cadence: input.cadenceHours,
        p_enabled: input.enabled,
      }),
    );
  }
  if (input.action === "monitorConfirm")
    return privateResult(
      await db.rpc("launch_confirm_event", {
        p_actor: active.member.id,
        p_binding: active.binding.id,
        p_event: input.id,
        p_confirm: input.confirmed,
        p_change: input.change,
        p_action: input.nextAction,
        p_deadline: input.deadline as string,
        p_priority: input.priority,
      }),
    );
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
    privateResult(
      await db.rpc("alpha_version_guard", {
        p_member: active.member.id,
        p_binding: active.binding.id,
        p_version: version,
      }),
    );
    const launch = await db
      .from("launch_submission_terms")
      .select("version_id")
      .eq("version_id", version)
      .maybeSingle();
    if (launch.error && launch.error.code !== "PGRST205") throw launch.error;
    let marketStatus: string | undefined;
    let marketEvidence:
      | {
          url: string | null;
          checkedAt: string;
          digest: string | null;
          limitation: string;
        }
      | undefined;
    if (launch.data) {
      const alpha = await db
        .from("alpha_versions")
        .select("*")
        .eq("version_id", version)
        .single();
      if (alpha.error) throw alpha.error;
      if (
        alpha.data.category === "Traders" ||
        alpha.data.category === "Degens"
      ) {
        const terms = await db
          .from("launch_submission_terms")
          .select("prediction,context")
          .eq("version_id", version)
          .single();
        if (terms.error) throw terms.error;
        const context = (terms.data.context as Record<string, string>) ?? {};
        if (
          alpha.data.category === "Traders" &&
          supportsCoinbaseSpot(alpha.data.subject, context, alpha.data.category)
        ) {
          const history = await marketHistorySource(alpha.data as AlphaVersion);
          const verification = verifyCoinbasePath(
            history,
            alpha.data.subject,
            alpha.data.created_at,
            alpha.data.horizon ?? "",
            (terms.data.prediction as Record<string, string>) ?? {},
            context,
          );
          marketStatus = verification.status;
          marketEvidence = {
            url: history.url,
            checkedAt: history.checkedAt,
            digest: history.digest,
            limitation: verification.reason,
          };
        } else {
          marketStatus = "Inconclusive";
          marketEvidence = {
            url: null,
            checkedAt: new Date().toISOString(),
            digest: null,
            limitation:
              "No supported ordered history for the registered asset, venue, instrument or chain.",
          };
        }
      }
    }
    return privateResult(
      await db.rpc(
        launch.data ? "launch_assess_outcome" : "alpha_assess_outcome",
        {
          p_member: active.member.id,
          p_binding: active.binding.id,
          p_version: version,
          p_request: request,
          p_data: {
            ...data,
            status:
              input.status === "cancelled" ? "inconclusive" : input.status,
            launchStatus:
              input.status === "cancelled" ? "Cancelled" : undefined,
            marketStatus,
            marketEvidence,
          } as unknown as Json,
        },
      ),
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
    if (!input.launch)
      throw new ServiceError(
        "LAUNCH_UNAVAILABLE",
        "Launch submission terms are required. Your draft is retained.",
        409,
      );
    const { request, ...data } = input;
    const result = await db.rpc("launch_submit", {
      p_member: active.member.id,
      p_binding: active.binding.id,
      p_request: request,
      p_data: data as unknown as Json,
    });
    // This exact, member-local limit is safe to explain; other private errors stay opaque.
    if (
      result.error?.message ===
      "research: three new alphas already submitted today"
    )
      throw new ServiceError(
        "DAILY_ALPHA_LIMIT",
        "You have submitted three new alphas today. Your draft is retained. New submissions reopen at 00:00 UTC; chat, corrections and material updates remain available.",
        409,
      );
    return privateResult(result) as { id: string; version: string };
  }
  if (input.action === "review") {
    const launch = await db
      .from("launch_submission_terms")
      .select("version_id")
      .eq("version_id", input.version)
      .maybeSingle();
    if (launch.error && launch.error.code !== "PGRST205") throw launch.error;
    if (launch.data && !input.workClass)
      throw new ServiceError(
        "WORK_CLASS_REQUIRED",
        "Choose a work classification before recording the decision.",
        409,
      );
    return privateResult(
      await db.rpc(launch.data ? "launch_decide" : "alpha_decide_v2", {
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
        ...(launch.data ? { p_work_class: input.workClass! } : {}),
      }),
    );
  }
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
