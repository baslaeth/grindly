"use client";
import { useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Send, Save, Check, FilePlus2, RefreshCw } from "lucide-react";
import { specialties, type ResearchData } from "@/research/model";

type Kind =
  | "promote"
  | "profile"
  | "message"
  | "submit"
  | "review"
  | "useful"
  | "dispute"
  | "assign"
  | "claimAssignment"
  | "deliverAssignment"
  | "peerRequest";
function Field({
  label,
  name,
  value = "",
  required = true,
  multiline = false,
  max = 1000,
  type = "text",
}: {
  label: string;
  name: string;
  value?: string;
  required?: boolean;
  multiline?: boolean;
  max?: number;
  type?: string;
}) {
  return (
    <label className="field">
      {label}
      {multiline ? (
        <textarea
          name={name}
          defaultValue={value}
          required={required}
          maxLength={max}
          rows={3}
        />
      ) : (
        <input
          name={name}
          type={type}
          defaultValue={value}
          required={required}
          maxLength={max}
        />
      )}
    </label>
  );
}
function SpecialtySelect({ value = "project" }: { value?: string }) {
  return (
    <label className="field">
      Specialty
      <select name="specialty" defaultValue={value}>
        {Object.entries(specialties).map(([key, label]) => (
          <option key={key} value={key}>
            {label}
          </option>
        ))}
      </select>
    </label>
  );
}
function sourceInput(value: string) {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((url) => ({ url, label: new URL(url).hostname }));
}
export function ResearchForm({
  kind,
  data,
  versionId,
  assignmentId,
  replyId,
  sourceMessage,
  label,
}: {
  kind: Kind;
  data?: ResearchData;
  versionId?: string;
  assignmentId?: string;
  replyId?: string;
  sourceMessage?: string;
  label?: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const profile = data?.profiles.find((p) => p.member_id === data.memberId);
  const version = data?.versions.find((v) => v.id === versionId);
  const finding = data?.findings.find((f) => f.id === version?.finding_id);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    setMessage("");
    const form = event.currentTarget;
    const fields = new FormData(form);
    const get = (key: string) => String(fields.get(key) ?? "").trim();
    let payload: Record<string, unknown> = { action: kind };
    try {
      if (kind === "profile")
        payload = {
          ...payload,
          name: get("name"),
          specialty: get("specialty"),
        };
      if (kind === "promote")
        payload = { ...payload, member: get("member"), reason: get("reason") };
      if (kind === "message")
        payload = {
          ...payload,
          body: get("body"),
          sources: sourceInput(get("sources")),
          reply: replyId ?? null,
        };
      if (kind === "submit")
        payload = {
          ...payload,
          finding: finding?.id ?? null,
          previous: version?.id ?? null,
          visibility: finding?.visibility ?? get("visibility"),
          specialty: get("specialty"),
          claim: get("claim"),
          sources: sourceInput(get("sources")),
          addition: get("addition"),
          limitations: get("limitations"),
          sourceMessage: sourceMessage ?? version?.source_message ?? null,
          relatedVersion: get("relatedVersion") || null,
          correction: version ? get("correction") : null,
          observedAt: new Date(get("observedAt")).toISOString(),
        };
      if (kind === "review")
        payload = {
          ...payload,
          version: versionId,
          assignment: assignmentId,
          decision: get("decision"),
          reason: get("reason"),
          conflicts: get("conflicts"),
          conflictFree: fields.get("conflictFree") === "on",
        };
      if (["useful", "dispute", "assign", "deliverAssignment"].includes(kind))
        payload.version = versionId;
      if (kind === "useful") payload.detail = get("detail");
      if (kind === "dispute") payload.reason = get("reason");
      if (kind === "peerRequest")
        payload = {
          ...payload,
          specialty: get("specialty"),
          request: get("request"),
        };
      const response = await fetch("/api/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(
          result.error?.message ?? "Could not save. Please retry.",
        );
      if (kind === "submit") router.push(`/findings/${result.id}`);
      else {
        setMessage("Saved.");
        if (kind === "message") form.reset();
      }
      router.refresh();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Could not save. Please retry.",
      );
    } finally {
      setPending(false);
    }
  }
  let fields: ReactNode = null;
  if (kind === "promote")
    fields = (
      <>
        <label className="field">
          Candidate
          <select name="member" required defaultValue="">
            <option value="" disabled>
              Select a member
            </option>
            {data?.profiles
              .filter((p) => p.member_id !== data.memberId)
              .map((p) => (
                <option key={p.member_id} value={p.member_id}>
                  {p.display_name}
                </option>
              ))}
          </select>
        </label>
        <Field
          label="Human assessment of accepted evidence and limitations"
          name="reason"
          multiline
          max={1500}
        />
      </>
    );
  if (kind === "profile")
    fields = (
      <>
        <Field
          label="Display name"
          name="name"
          value={profile?.display_name}
          max={60}
        />
        <SpecialtySelect value={profile?.specialty} />
        <p className="muted">
          Self-described focus. Review authority is assigned separately.
        </p>
      </>
    );
  if (kind === "message")
    fields = (
      <>
        <Field
          label={replyId ? "Your reply" : "Add to the discussion"}
          name="body"
          multiline
          max={2000}
        />
        <Field
          label="Source URLs (one per line, optional)"
          name="sources"
          multiline
          max={4000}
          required={false}
        />
      </>
    );
  if (kind === "submit")
    fields = (
      <>
        <Field
          label="Main claim"
          name="claim"
          value={version?.claim}
          multiline
        />
        <SpecialtySelect value={version?.specialty ?? profile?.specialty} />
        <Field
          label="Evidence URLs (one per line)"
          name="sources"
          multiline
          max={4000}
          value={
            Array.isArray(version?.sources)
              ? version.sources
                  .map((s) =>
                    s && typeof s === "object" && "url" in s ? s.url : "",
                  )
                  .join("\n")
              : ""
          }
        />
        <Field
          label="What you added"
          name="addition"
          multiline
          value={version?.addition}
          max={2000}
        />
        <Field
          label="Important limitations"
          name="limitations"
          multiline
          value={version?.limitations}
        />
        <Field
          label="Observation time (your local time)"
          name="observedAt"
          type="datetime-local"
        />
        <label className="field">
          Related contribution
          <select
            name="relatedVersion"
            defaultValue={version?.related_version ?? ""}
          >
            <option value="">None</option>
            {data?.findings
              .filter((f) => f.id !== finding?.id)
              .map((f) => {
                const v = data.versions.find((v) => v.id === f.current_version);
                return (
                  v && (
                    <option value={v.id} key={v.id}>
                      {v.claim} ({f.visibility})
                    </option>
                  )
                );
              })}
          </select>
        </label>
        {finding ? (
          <p>
            Permissions retained:{" "}
            {finding.visibility === "members"
              ? "All members"
              : "Author + scoped review team"}
          </p>
        ) : (
          <label className="field">
            Permissions
            <select name="visibility" defaultValue="members">
              <option value="members">All members</option>
              <option value="reviewers">
                Author + scoped review team only
              </option>
            </select>
          </label>
        )}
        {version && (
          <Field
            label="What this correction changes"
            name="correction"
            multiline
          />
        )}
        <label className="check-field">
          <input required type="checkbox" /> I have permission to share these
          sources and have distinguished my work from others&apos;
          contributions.
        </label>
      </>
    );
  if (kind === "review")
    fields = (
      <>
        <label className="field">
          Decision
          <select name="decision">
            <option value="accept">
              Accept this exact version within assigned scope
            </option>
            <option value="correct">Request correction</option>
          </select>
        </label>
        <Field
          label="Reasons and scope limits"
          name="reason"
          multiline
          max={1500}
        />
        <Field label="Conflicts disclosure" name="conflicts" max={500} />
        <label className="check-field">
          <input name="conflictFree" required type="checkbox" /> I can assess
          this independently, without a disqualifying conflict.
        </label>
      </>
    );
  if (kind === "useful")
    fields = (
      <Field label="How this helped your specialty" name="detail" multiline />
    );
  if (kind === "dispute")
    fields = (
      <Field
        label="Reason for independent review"
        name="reason"
        multiline
        max={1500}
      />
    );
  if (kind === "peerRequest")
    fields = (
      <>
        <SpecialtySelect />
        <Field label="The specific help you need" name="request" multiline />
      </>
    );
  const Icon =
    kind === "message" || kind === "peerRequest"
      ? Send
      : kind === "submit"
        ? FilePlus2
        : kind === "review"
          ? Check
          : Save;
  return (
    <form className="research-form" onSubmit={submit}>
      <fieldset disabled={pending}>
        {fields}
        <button className="button" type="submit">
          <Icon size={16} aria-hidden="true" />
          {pending
            ? "Saving..."
            : (label ??
              {
                promote: "Approve Silver on current token",
                profile: "Save profile",
                message: replyId ? "Reply" : "Post message",
                submit: version
                  ? "Submit corrected version"
                  : "Submit for review",
                review: "Record decision",
                useful: "Record usefulness",
                dispute: "Request independent review",
                assign: "Assign available reviewer",
                claimAssignment: "Claim unfunded demo assignment",
                deliverAssignment: "Submit this version as deliverable",
                peerRequest: "Send peer request",
              }[kind])}
        </button>
      </fieldset>
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
      {message && (
        <p role="status" className="form-message">
          {message}
        </p>
      )}
    </form>
  );
}
export function RefreshResearch() {
  const router = useRouter();
  return (
    <button
      className="button secondary icon-button"
      title="Refresh research"
      aria-label="Refresh research"
      onClick={() => router.refresh()}
    >
      <RefreshCw size={18} />
    </button>
  );
}
