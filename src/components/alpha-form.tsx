"use client";
import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { FilePlus2, Paperclip, X } from "lucide-react";
import {
  alphaCategories,
  alphaSubmission,
  contributionTypes,
  type AlphaCategory,
  type Evidence,
} from "@/alpha/model";
import { person, type ResearchData } from "@/research/model";
import {
  categoryFields,
  primaryFocus,
  checklistVersion,
} from "@/alpha/checklists";

function CategoryField({
  field,
  value = "",
}: {
  field: (typeof categoryFields)[AlphaCategory][number];
  value?: string;
}) {
  const [mode, setMode] = useState(
    /^(unknown|not applicable)$/i.test(value) ? value.toLowerCase() : "details",
  );
  return (
    <div className="category-field">
      <label className="field">
        <span>{field.label} *</span>
        {mode === "details" ? (
          <input
            key={mode}
            name={`detail-${field.key}`}
            type={
              field.kind === "date"
                ? "datetime-local"
                : field.kind === "url"
                  ? "url"
                  : "text"
            }
            required
            maxLength={1000}
            defaultValue={
              /^(unknown|not applicable)$/i.test(value)
                ? ""
                : field.kind === "date"
                  ? value.slice(0, 16)
                  : value
            }
          />
        ) : (
          <input
            key={mode}
            name={`detail-${field.key}`}
            value={mode === "unknown" ? "Unknown" : "Not applicable"}
            readOnly
          />
        )}
      </label>
      <select
        aria-label={`${field.label} answer`}
        value={mode}
        onChange={(e) => setMode(e.target.value)}
      >
        <option value="details">Provide context</option>
        <option value="unknown">Unknown</option>
        <option value="not applicable">Not applicable</option>
      </select>
    </div>
  );
}

function Field({
  label,
  name,
  value = "",
  required = false,
  type = "text",
  rows = 2,
  max = 1000,
}: {
  label: string;
  name: string;
  value?: string;
  required?: boolean;
  type?: string;
  rows?: number;
  max?: number;
}) {
  return (
    <label className="field">
      <span>
        {label}
        {required ? " *" : ""}
      </span>
      {type === "text" ? (
        <textarea
          name={name}
          defaultValue={value}
          required={required}
          maxLength={max}
          rows={rows}
        />
      ) : (
        <input
          name={name}
          type={type}
          defaultValue={value}
          required={required}
        />
      )}
    </label>
  );
}
export function AlphaForm({
  data,
  versionId,
  sourceMessage,
}: {
  data: ResearchData;
  versionId?: string;
  sourceMessage?: string;
}) {
  const router = useRouter();
  const version = data.versions.find((v) => v.id === versionId);
  const finding = data.findings.find((f) => f.id === version?.finding_id);
  const av = data.alphas?.find((a) => a.version_id === versionId);
  const profile = data.profiles.find((p) => p.member_id === data.memberId);
  const currentMessage = data.messages.find(
    (m) => m.id === (sourceMessage ?? version?.source_message),
  );
  const original = data.sourceSnapshots?.find((s) => s.version === versionId);
  const message =
    original && currentMessage
      ? { ...currentMessage, body: original.body, revision: original.revision }
      : currentMessage;
  const initial =
    av?.category ??
    (alphaCategories.includes(data.question.category as AlphaCategory)
      ? (data.question.category as AlphaCategory)
      : (primaryFocus(profile) as AlphaCategory | null)) ??
    "";
  const [category, setCategory] = useState<AlphaCategory | "">(initial);
  const contextFields = category ? categoryFields[category] : [];
  const [kind, setKind] = useState<keyof typeof contributionTypes>(
    version ? "correction" : "find",
  );
  const [files, setFiles] = useState<
    { id: string; file: File; progress: number; uploaded: boolean }[]
  >([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const sending = useRef(false);
  const request = useRef<{ payload: string; id: string } | null>(null);
  const room =
    data.rooms?.find((r) => r.category === category)?.id ?? data.question.id;
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (sending.current) return;
    sending.current = true;
    setBusy(true);
    setError("");
    const fields = new FormData(e.currentTarget);
    const get = (k: string) => String(fields.get(k) ?? "").trim();
    try {
      for (const file of files.filter((f) => !f.uploaded))
        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open("POST", "/api/chat/media");
          xhr.setRequestHeader("Content-Type", file.file.type);
          xhr.setRequestHeader("X-Room", room);
          xhr.setRequestHeader("X-Upload-ID", file.id);
          xhr.timeout = 45000;
          xhr.upload.onprogress = (e) => {
            if (e.lengthComputable)
              setFiles((items) =>
                items.map((i) =>
                  i.id === file.id
                    ? { ...i, progress: Math.round((e.loaded / e.total) * 100) }
                    : i,
                ),
              );
          };
          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              setFiles((items) =>
                items.map((item) =>
                  item.id === file.id
                    ? { ...item, uploaded: true, progress: 100 }
                    : item,
                ),
              );
              resolve();
            } else
              reject(
                new Error("Evidence upload failed. Your input is retained."),
              );
          };
          xhr.onerror = xhr.ontimeout = () =>
            reject(new Error("Upload unavailable. Retry."));
          xhr.send(file.file);
        });
      const evidence: Evidence[] = get("evidence")
        .split(/\r?\n/)
        .map((s) => s.trim())
        .filter(Boolean)
        .map((value) =>
          /^0x[0-9a-fA-F]{64}$/.test(value)
            ? { kind: "transaction", value, label: "Transaction reference" }
            : { kind: "link", value, label: new URL(value).hostname },
        );
      evidence.push(
        ...files.map((f) => ({
          kind: "attachment" as const,
          value: f.id,
          label: f.file.name.slice(0, 120),
        })),
      );
      if (av)
        evidence.push(...av.evidence.filter((e) => e.kind === "attachment"));
      if (message?.revision)
        evidence.push({
          kind: "message",
          value: message.id,
          revision: message.revision,
          label: `Source by ${person(data, message.author_id)}`,
        });
      const extra = data.messages.find((m) => m.id === get("linkedMessage"));
      if (extra?.revision && extra.id !== message?.id)
        evidence.push({
          kind: "message",
          value: extra.id,
          revision: extra.revision,
          label: `Source by ${person(data, extra.author_id)}`,
        });
      const date = (key: string) =>
        get(key) ? new Date(get(key) + "Z").toISOString() : null;
      const payload = {
        action: "submit",
        finding: finding?.id ?? null,
        previous: version?.id ?? null,
        category,
        type: kind,
        visibility: finding?.visibility ?? get("visibility"),
        claim: get("claim"),
        purpose: get("purpose"),
        addition: get("addition"),
        limitations: get("limitations"),
        subject: get("subject"),
        chain: get("chain"),
        contract: get("contract"),
        details: Object.fromEntries(
          contextFields.map((f) => [
            f.key,
            f.kind === "date" &&
            !/^(unknown|not applicable)$/i.test(get(`detail-${f.key}`)) &&
            get(`detail-${f.key}`)
              ? new Date(get(`detail-${f.key}`) + "Z").toISOString()
              : get(`detail-${f.key}`),
          ]),
        ),
        checklist: checklistVersion,
        evidence,
        firstNoticed: date("firstNoticed"),
        horizon: date("horizon"),
        checkCondition: get("checkCondition"),
        sourceMessage: message?.id ?? null,
        sourceRevision: message?.revision ?? null,
        relatedVersion: get("relatedVersion") || null,
        correction: version ? get("correction") : null,
      };
      const serialized = JSON.stringify(payload);
      if (request.current?.payload !== serialized)
        request.current = { payload: serialized, id: crypto.randomUUID() };
      const validated = alphaSubmission.safeParse({
        ...payload,
        request: request.current.id,
      });
      if (!validated.success)
        throw new Error(
          validated.error.issues
            .slice(0, 3)
            .map((i) => i.message)
            .join(" "),
        );
      const response = await fetch("/api/alpha", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated.data),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(
          result.error?.message ?? "Could not submit. Your input is retained.",
        );
      router.push(`/findings/${result.id}?saved=${result.version}`);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not submit. Retry.");
    } finally {
      sending.current = false;
      setBusy(false);
    }
  }
  return (
    <form onSubmit={submit} className="research-form" aria-busy={busy}>
      {data.evaluationAvailable === false && (
        <p className="notice" role="status">
          Saving new alpha is temporarily unavailable while the review service
          is updated. Existing records remain available. You can inspect the
          form, but it cannot submit yet.
        </p>
      )}
      <fieldset disabled={busy}>
        <label className="field">
          Contribution category
          <select
            aria-label="Contribution category"
            required
            value={category}
            disabled={!!av}
            onChange={(e) => setCategory(e.target.value as AlphaCategory)}
          >
            <option value="" disabled>
              Choose a category
            </option>
            {alphaCategories.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
        <p className="muted">
          Your profile focus is separate. You may contribute in any category
          within {data.token.tier}.
        </p>
        <label className="field">
          Contribution type
          <select
            aria-label="Contribution type"
            value={kind}
            onChange={(e) =>
              setKind(e.target.value as keyof typeof contributionTypes)
            }
          >
            {Object.entries(contributionTypes).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <Field
          label="Subject or project"
          name="subject"
          value={av?.subject}
          required
          max={120}
        />
        {!!category && (
          <section className="form-step" aria-label="Category context">
            <h3>{category}</h3>
            {contextFields.map((field) => (
              <CategoryField
                key={`${category}:${field.key}`}
                field={field}
                value={av?.details[field.key]}
              />
            ))}
            {["Degens", "NFT Specialists", "Airdrop Hunters"].includes(
              category,
            ) && (
              <>
                <Field
                  label="Chain or network"
                  name="chain"
                  value={av?.chain}
                  required
                  max={40}
                />
                <Field
                  label="Asset or contract identifier"
                  name="contract"
                  value={av?.contract}
                  required={["Degens", "NFT Specialists"].includes(category)}
                  max={160}
                />
                <p className="muted">
                  Use Unknown or Not applicable when needed. Automatic chain
                  checks cover Robinhood Chain testnet 46630 and EVM addresses
                  only. Other identifiers remain unverified references.
                </p>
              </>
            )}
            <Field
              label="Horizon or milestone (UTC)"
              name="horizon"
              type="datetime-local"
              value={av?.horizon?.slice(0, 16)}
              required={kind === "prediction"}
            />
            <Field
              label="What would count against the claim or establish the outcome?"
              name="checkCondition"
              value={av?.check_condition}
              required={kind === "prediction"}
            />
            <p className="muted">
              A prediction needs a future horizon and clear criteria. Finds,
              guides and warnings do not need a price target.
            </p>
          </section>
        )}
        {message && (
          <aside className="notice">
            Source: {person(data, message.author_id)}. Posted{" "}
            <time>{new Date(message.created_at).toISOString()}</time>
            <p>{message.body}</p>
            <p>
              The source remains attributed to its author. Describe your own
              addition below.
            </p>
          </aside>
        )}
        <div className="form-step">
          <Field
            label="What did you find or conclude?"
            name="claim"
            value={version?.claim}
            required
          />
          <Field
            label="Why does it matter to members?"
            name="purpose"
            value={av?.purpose}
            required
          />
        </div>
        <div className="form-step">
          <h3>Evidence</h3>
          <Field
            label="Links or transaction hashes (one per line)"
            name="evidence"
            value={
              av?.evidence
                .filter((e) => ["link", "transaction"].includes(e.kind))
                .map((e) => e.value)
                .join("\n") ??
              (Array.isArray(version?.sources)
                ? version.sources
                    .map((s) =>
                      s && typeof s === "object" && "url" in s ? s.url : "",
                    )
                    .filter(Boolean)
                    .join("\n")
                : "")
            }
            max={4000}
          />
          <label className="field">
            Linked room message
            <select
              aria-label="Linked room message"
              name="linkedMessage"
              defaultValue=""
            >
              <option value="">None</option>
              {data.messages
                .filter((m) => !m.deleted)
                .map((m) => (
                  <option key={m.id} value={m.id}>
                    {person(data, m.author_id)}: {m.body.slice(0, 100)}
                  </option>
                ))}
            </select>
          </label>
          <label className="button secondary">
            <Paperclip size={16} />
            Attach evidence
            <input
              aria-label="Attach evidence"
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              multiple
              className="sr-only"
              onChange={(e) => {
                const chosen = Array.from(e.target.files ?? []);
                if (
                  chosen.some((f) => f.size > 2097152) ||
                  files.length + chosen.length > 4
                ) {
                  setError("Use up to four images, at most 2 MB each.");
                  return;
                }
                setFiles((old) => [
                  ...old,
                  ...chosen.map((file) => ({
                    id: crypto.randomUUID(),
                    file,
                    progress: 0,
                    uploaded: false,
                  })),
                ]);
                e.target.value = "";
              }}
            />
          </label>
          {files.map((f) => (
            <div key={f.id} className="form-actions">
              <span>
                {f.file.name} {busy ? `${f.progress}%` : ""}
              </span>
              <button
                className="button secondary icon-button"
                type="button"
                title={`Remove ${f.file.name}`}
                aria-label={`Remove ${f.file.name}`}
                onClick={() =>
                  setFiles((old) => old.filter((x) => x.id !== f.id))
                }
              >
                <X size={16} />
              </button>
            </div>
          ))}
          {!!av?.evidence.some((e) => e.kind === "attachment") && (
            <p>Earlier attached evidence is retained in this correction.</p>
          )}
          <Field
            label="What did you personally discover, test, or add?"
            name="addition"
            value={version?.addition}
            required
            max={2000}
          />
          <Field
            label="What is uncertain or risky?"
            name="limitations"
            value={version?.limitations}
            required
          />
        </div>
        <details>
          <summary>Additional provenance</summary>
          <div className="form-step">
            {!["Degens", "NFT Specialists", "Airdrop Hunters"].includes(
              category,
            ) && (
              <>
                <Field
                  label="Chain or network (optional)"
                  name="chain"
                  value={av?.chain}
                  max={40}
                />
                <Field
                  label="Asset or contract identifier (optional)"
                  name="contract"
                  value={av?.contract}
                  max={160}
                />
              </>
            )}
            <Field
              label="First noticed (self-reported, UTC)"
              name="firstNoticed"
              type="datetime-local"
              value={av?.first_noticed?.slice(0, 16)}
            />
            <p className="muted">
              Submission time is recorded by the server. Self-reported times do
              not establish first-discovery credit.
            </p>
          </div>
        </details>
        <details>
          <summary>Attribution and sensitive-material permissions</summary>
          <label className="field">
            Related contribution
            <select
              aria-label="Related contribution"
              name="relatedVersion"
              defaultValue={version?.related_version ?? ""}
            >
              <option value="">None</option>
              {data.findings
                .filter((f) => f.id !== finding?.id)
                .map((f) => (
                  <option key={f.id} value={f.current_version ?? ""}>
                    {
                      data.versions.find((v) => v.id === f.current_version)
                        ?.claim
                    }
                  </option>
                ))}
            </select>
          </label>
          {finding ? (
            <p>Existing permissions retained: {finding.visibility}.</p>
          ) : (
            <label className="field">
              Permissions
              <select
                aria-label="Permissions"
                name="visibility"
                defaultValue="members"
              >
                <option value="members">Members in this rank</option>
                <option value="reviewers">
                  Author + authorized review team only
                </option>
              </select>
            </label>
          )}
        </details>
        {version && (
          <Field
            label="What this correction changes"
            name="correction"
            required
          />
        )}
        <label className="check-field">
          <input required type="checkbox" /> I have permission to share this
          evidence and have identified my own contribution.
        </label>
        <button
          className="button"
          type="submit"
          disabled={data.evaluationAvailable === false}
        >
          <FilePlus2 size={16} />
          {busy
            ? "Saving..."
            : version
              ? "Submit corrected version"
              : "Submit for review"}
        </button>
      </fieldset>
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
    </form>
  );
}
