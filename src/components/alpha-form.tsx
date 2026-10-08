"use client";
import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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
import { launchFields, legacyDetails } from "@/launch/forms";
import { formAliases, submissionTypes } from "@/launch/form-aliases";
import { launchPolicy } from "@/launch/policy";
import { airdropGuideVersion, airdropStages } from "@/alpha/airdrop";

function CategoryField({
  field,
  value = "",
  prefix = "detail",
}: {
  field:
    | (typeof categoryFields)[AlphaCategory][number]
    | (typeof launchFields)[AlphaCategory][number];
  value?: string;
  prefix?: string;
}) {
  const [mode, setMode] = useState(
    /^(unknown|not applicable)$/i.test(value)
      ? value.toLowerCase()
      : !value && prefix === "launch" && !("core" in field && field.core)
        ? "unknown"
        : "details",
  );
  return (
    <div className="category-field">
      <label className="field">
        <span>{field.label} *</span>
        {mode === "details" ? (
          "options" in field && field.options ? (
            <select
              key={mode}
              aria-label={`${field.label} *`}
              name={`${prefix}-${field.key}`}
              required
              defaultValue={value}
            >
              <option value="" disabled>
                Choose
              </option>
              {field.options.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          ) : (
            <input
              key={mode}
              name={`${prefix}-${field.key}`}
              type={
                field.kind === "date"
                  ? "datetime-local"
                  : field.kind === "url"
                    ? "url"
                    : field.kind === "number"
                      ? "number"
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
          )
        ) : (
          <input
            key={mode}
            name={`${prefix}-${field.key}`}
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
          minLength={
            name === "usefulAction" ? 10 : name === "costOrRisk" ? 5 : undefined
          }
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
  const launchActive = data.launchAvailable === true;
  const launchTerm = data.launchTerms?.find((t) => t.version_id === versionId);
  const airdropGuide = data.airdropGuides?.find(
    (t) => t.version_id === versionId,
  )?.details;
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
  const launchContextFields = category ? launchFields[category] : [];
  const [kind, setKind] = useState<keyof typeof contributionTypes>(
    version ? "correction" : "find",
  );
  const aliases = category
    ? formAliases(category, launchTerm?.context, {
        subject: av?.subject ?? "",
        usefulAction: launchTerm?.useful_action ?? version?.claim ?? "",
        purpose: av?.purpose ?? "",
        costOrRisk: launchTerm?.cost_or_risk ?? version?.limitations ?? "",
      })
    : {};
  const [includePrediction, setIncludePrediction] = useState(
    !!launchTerm?.prediction,
  );
  const showPrediction = kind === "prediction" || includePrediction;
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
    const get = (k: string) =>
      String(
        fields.get(
          k === "usefulAction" && category === "Airdrop Hunters"
            ? "addition"
            : k,
        ) ?? "",
      ).trim();
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
      if (
        category === "Airdrop Hunters" &&
        get("airdrop-official").startsWith("https://") &&
        !evidence.some((e) => e.value === get("airdrop-official"))
      )
        evidence.unshift({
          kind: "link",
          value: get("airdrop-official"),
          label: "Official campaign documentation",
        });
      for (const field of launchContextFields.filter(
        (f) => f.kind === "url" || f.key === "official",
      )) {
        const value = get(`launch-${field.key}`);
        if (
          value.startsWith("https://") &&
          !evidence.some((e) => e.value === value)
        )
          evidence.push({ kind: "link", value, label: field.label });
      }
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
      const predictionContext: Record<string, string> = showPrediction
        ? {
            direction: get("direction") || "Unknown",
            entry: get("entry") || "Unknown",
            stop: get("stop") || "Unknown",
            target: get("target") || "Unknown",
            invalidation: get("invalidation") || "Unknown",
            expiry: date("horizon") || "Unknown",
            sourceType: get("sourceType") || "Unknown",
          }
        : {};
      const launchContext = Object.fromEntries(
        launchContextFields.map((f) => [
          f.key,
          f.fromPrediction
            ? predictionContext[f.key] || "Unknown"
            : f.kind === "date" &&
                !/^(unknown|not applicable)$/i.test(get(`launch-${f.key}`)) &&
                get(`launch-${f.key}`)
              ? new Date(get(`launch-${f.key}`) + "Z").toISOString()
              : get(`launch-${f.key}`) || "Unknown",
        ]),
      );
      for (const [key, field] of Object.entries(aliases))
        launchContext[key] = get(field) || "Unknown";
      if (category === "Airdrop Hunters") {
        launchContext.project = get("subject");
        launchContext.status = "Unknown";
        launchContext.costs = get("costOrRisk");
        launchContext.testedSteps = get("airdrop-testEvidence") || "Not tested";
      }
      const details =
        launchActive && category
          ? legacyDetails(category, launchContext)
          : Object.fromEntries(
              contextFields.map((f) => [
                f.key,
                f.kind === "date" &&
                !/^(unknown|not applicable)$/i.test(get(`detail-${f.key}`)) &&
                get(`detail-${f.key}`)
                  ? new Date(get(`detail-${f.key}`) + "Z").toISOString()
                  : get(`detail-${f.key}`),
              ]),
            );
      const payload = {
        action: "submit",
        finding: finding?.id ?? null,
        previous: version?.id ?? null,
        category,
        type: kind,
        visibility: finding?.visibility ?? get("visibility"),
        claim: launchActive ? get("usefulAction") : get("claim"),
        purpose:
          category === "Airdrop Hunters" ? get("usefulAction") : get("purpose"),
        addition: get("addition"),
        limitations: launchActive ? get("costOrRisk") : get("limitations"),
        subject: get("subject"),
        chain: launchActive
          ? (launchContext.chain ?? launchContext.network ?? get("chain"))
          : get("chain"),
        contract: launchActive
          ? ["Degens", "NFT Specialists"].includes(category)
            ? (launchContext.identifier ??
              (launchContext.official &&
              !launchContext.official.startsWith("https://")
                ? launchContext.official
                : "Unknown"))
            : get("contract")
          : get("contract"),
        details,
        ...(launchActive && category === "Airdrop Hunters"
          ? {
              airdrop: {
                version: airdropGuideVersion,
                stage: get("airdrop-stage"),
                official: get("airdrop-official"),
                confirmed: get("airdrop-confirmed"),
                speculative: get("airdrop-speculative") || "Unknown",
                steps: get("airdrop-steps"),
                prerequisites: get("airdrop-prerequisites") || "Unknown",
                testEvidence: get("airdrop-testEvidence") || "Unknown",
                exclusions: get("airdrop-exclusions") || "Unknown",
              },
            }
          : {}),
        ...(launchActive
          ? {
              launch: {
                policyVersion: launchPolicy.version,
                opportunity: get("subject"),
                usefulAction: get("usefulAction"),
                costOrRisk: get("costOrRisk"),
                context: launchContext,
                prediction: showPrediction
                  ? {
                      commitment: get("commitment"),
                      predictionClass: get("predictionClass"),
                      baseline: get("baseline") || "Unknown",
                      target: get("target") || "Unknown",
                      invalidation: get("invalidation") || "Unknown",
                      sourceType: get("sourceType"),
                      startsAt: date("startsAt"),
                      direction: get("direction") || null,
                      entry: get("entry"),
                      stop: get("stop"),
                    }
                  : null,
              },
            }
          : {}),
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
      {data.launchAllowance && (
        <p className="muted">
          {data.launchAllowance.dailyRemaining} new alphas remaining today
          (UTC). Corrections and material updates do not use this allowance.
        </p>
      )}
      {(!data.evaluationAvailable || !launchActive) && (
        <p className="notice" role="status">
          Submissions are temporarily unavailable. Your draft and existing
          records remain available.
        </p>
      )}
      <fieldset disabled={busy}>
        <legend>1. Your alpha</legend>
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
        <label className="field">
          Contribution type
          <select
            aria-label="Contribution type"
            value={kind}
            onChange={(e) =>
              setKind(e.target.value as keyof typeof contributionTypes)
            }
          >
            {submissionTypes(!!version).map((key) => (
              <option key={key} value={key}>
                {key === "find"
                  ? "Finding or analysis"
                  : contributionTypes[key]}
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
            {launchActive ? (
              <>
                {category === "Airdrop Hunters" && (
                  <>
                    <label className="field">
                      Program stage
                      <select
                        name="airdrop-stage"
                        defaultValue={airdropGuide?.stage ?? "Unknown"}
                      >
                        {airdropStages.map((stage) => (
                          <option key={stage}>{stage}</option>
                        ))}
                      </select>
                    </label>
                    <Field
                      label="Official campaign or documentation link (Unknown allowed)"
                      name="airdrop-official"
                      required
                      value={airdropGuide?.official}
                      max={500}
                    />
                    <Field
                      label="Published facts (not personal eligibility)"
                      name="airdrop-confirmed"
                      required
                      value={airdropGuide?.confirmed}
                    />
                    <Field
                      label="Short steps to follow"
                      name="airdrop-steps"
                      required
                      value={airdropGuide?.steps}
                    />
                    <details>
                      <summary>
                        Prerequisites, speculation and exclusions
                      </summary>
                      <Field
                        label="Prerequisites"
                        name="airdrop-prerequisites"
                        value={airdropGuide?.prerequisites ?? "Unknown"}
                      />
                      <Field
                        label="What is speculation, not confirmed?"
                        name="airdrop-speculative"
                        value={airdropGuide?.speculative ?? "Unknown"}
                      />
                      <Field
                        label="Who or what is excluded?"
                        name="airdrop-exclusions"
                        value={airdropGuide?.exclusions ?? "Unknown"}
                      />
                      <Field
                        label="Personally tested steps and evidence (or Not tested)"
                        name="airdrop-testEvidence"
                        value={airdropGuide?.testEvidence ?? "Not tested"}
                      />
                    </details>
                  </>
                )}
                {launchContextFields
                  .filter(
                    (f) =>
                      f.core &&
                      !f.fromPrediction &&
                      !aliases[f.key] &&
                      !(
                        category === "Airdrop Hunters" &&
                        ["project", "status", "testedSteps"].includes(f.key)
                      ),
                  )
                  .map((field) => (
                    <CategoryField
                      key={`${category}:${field.key}`}
                      field={field}
                      prefix="launch"
                      value={launchTerm?.context[field.key]}
                    />
                  ))}
                {launchContextFields.some(
                  (f) => !f.core && !f.fromPrediction,
                ) && (
                  <details>
                    <summary>Additional category details</summary>
                    {launchContextFields
                      .filter(
                        (f) =>
                          !f.core &&
                          !f.fromPrediction &&
                          !aliases[f.key] &&
                          !(
                            category === "Airdrop Hunters" && f.key === "costs"
                          ),
                      )
                      .map((field) => (
                        <CategoryField
                          key={`${category}:${field.key}`}
                          field={field}
                          prefix="launch"
                          value={launchTerm?.context[field.key]}
                        />
                      ))}
                  </details>
                )}
              </>
            ) : (
              contextFields.map((field) => (
                <CategoryField
                  key={`${category}:${field.key}`}
                  field={field}
                  value={av?.details[field.key]}
                />
              ))
            )}
            {!launchActive &&
              ["Degens", "NFT Specialists", "Airdrop Hunters"].includes(
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
                    Use Unknown or Not applicable when needed. Evidence supports
                    Robinhood Chain testnet 46630; Ethereum 1, Base 8453,
                    Arbitrum 42161, Polygon 137 and BSC 56 token references; and
                    Solana mainnet-beta or Solana devnet. Use an exact contract
                    or mint address. Coverage varies by provider; unsupported
                    identifiers stay unverified. Solana transactions may be
                    linked with an explorer.solana.com/tx/ URL (add
                    ?cluster=devnet for devnet).
                  </p>
                </>
              )}
            {kind !== "prediction" && launchActive && (
              <label className="check-field">
                <input
                  type="checkbox"
                  checked={includePrediction}
                  onChange={(e) => setIncludePrediction(e.target.checked)}
                />
                Include a measurable later prediction
              </label>
            )}
            {showPrediction && (
              <div className="form-step">
                <h3>Prediction terms</h3>
                <div className="form-actions">
                  <label className="field">
                    Commitment
                    <select
                      name="commitment"
                      defaultValue={
                        launchTerm?.prediction?.commitment ?? "normal"
                      }
                    >
                      <option value="normal">Normal</option>
                      <option value="high">
                        High (requires unused XP reserve)
                      </option>
                    </select>
                  </label>
                  <label className="field">
                    Class
                    <select
                      name="predictionClass"
                      defaultValue={
                        launchTerm?.prediction?.predictionClass ?? "standard"
                      }
                    >
                      <option value="standard">Standard</option>
                      <option value="enhanced">
                        Approved long-term (30+ days)
                      </option>
                    </select>
                  </label>
                  <label className="field">
                    Source type
                    <select
                      name="sourceType"
                      defaultValue={
                        launchTerm?.prediction?.sourceType ?? "unknown"
                      }
                    >
                      <option value="unknown">Unknown</option>
                      <option value="public_research">Public research</option>
                      <option value="private_lead">Private lead</option>
                      <option value="claimed_insider">Claimed insider</option>
                    </select>
                  </label>
                </div>
                <Field
                  label="Original baseline (Unknown allowed)"
                  name="baseline"
                  value={launchTerm?.prediction?.baseline}
                />
                <Field
                  label="Measurable target (Unknown allowed)"
                  name="target"
                  value={launchTerm?.prediction?.target}
                />
                <Field
                  label="Failure or invalidation condition (Unknown allowed)"
                  name="invalidation"
                  value={launchTerm?.prediction?.invalidation}
                />
                {["Traders", "Degens"].includes(category) && (
                  <>
                    <label className="field">
                      Direction
                      <select
                        name="direction"
                        defaultValue={launchTerm?.prediction?.direction ?? ""}
                      >
                        <option value="">Unknown</option>
                        <option value="long">Long</option>
                        <option value="short">Short</option>
                      </select>
                    </label>
                    <Field
                      label="Registered entry or trigger"
                      name="entry"
                      value={launchTerm?.prediction?.entry}
                    />
                    <Field
                      label="Registered stop"
                      name="stop"
                      value={launchTerm?.prediction?.stop}
                    />
                  </>
                )}
                <Field
                  label="Deadline or observation horizon (UTC)"
                  name="horizon"
                  type="datetime-local"
                  value={av?.horizon?.slice(0, 16)}
                />
                <Field
                  label="How will the outcome be checked?"
                  name="checkCondition"
                  value={av?.check_condition}
                />
                <Field
                  label="Scored window begins (enhanced only, UTC)"
                  name="startsAt"
                  type="datetime-local"
                  value={launchTerm?.prediction?.startsAt?.slice(0, 16)}
                />
                <p className="muted">
                  Incomplete terms can be saved and shared, but are unvalidated
                  and cannot earn outcome XP. High commitment reserves unused XP
                  only for a validated call. Ordered price settlement currently
                  supports BTC, ETH or SOL spot on Coinbase Exchange, with the
                  same asset in Subject and Asset, an exact UTC-hour expiry
                  within seven days, and complete historical observations. Other
                  venues, derivatives, contracts and longer paths remain
                  unvalidated.
                </p>
              </div>
            )}
          </section>
        )}
        {launchActive && (
          <div className="form-step">
            {category !== "Airdrop Hunters" && (
              <Field
                label="Useful action or claim"
                name="usefulAction"
                value={launchTerm?.useful_action ?? version?.claim}
                required
              />
            )}
            <Field
              label={
                category === "Airdrop Hunters"
                  ? "Known costs, lockups and main risk"
                  : "Cost or main risk"
              }
              name="costOrRisk"
              value={launchTerm?.cost_or_risk ?? version?.limitations}
              required
            />
          </div>
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
        {(!launchActive || category !== "Airdrop Hunters") && (
          <div className="form-step">
            {!launchActive && (
              <Field
                label="What did you find or conclude?"
                name="claim"
                value={version?.claim}
                required
              />
            )}
            {category !== "Airdrop Hunters" && (
              <Field
                label="Why does it matter to members?"
                name="purpose"
                value={av?.purpose}
                required
              />
            )}
          </div>
        )}
        <div className="form-step">
          <h3>2. Evidence and your work</h3>
          <details open={category !== "Airdrop Hunters"}>
            <summary>Additional links, screenshots or linked messages</summary>
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
          </details>
          <Field
            label={
              category === "Airdrop Hunters"
                ? "Your useful discovery, warning or improvement"
                : "What did you personally discover, test, or add?"
            }
            name="addition"
            value={version?.addition}
            required
            max={2000}
          />
          {!launchActive && (
            <Field
              label="What is uncertain or risky?"
              name="limitations"
              value={version?.limitations}
              required
            />
          )}
        </div>
        <details>
          <summary>Identifiers and dates (optional)</summary>
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
          <summary>Audience and related work</summary>
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
                    {data.alphas?.find(
                      (a) => a.version_id === f.current_version,
                    )?.subject ??
                      data.versions.find((v) => v.id === f.current_version)
                        ?.claim}
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
            label={
              kind === "update"
                ? "What changed since the previous version"
                : "What this correction changes"
            }
            name="correction"
            required
          />
        )}
        <label className="check-field">
          <input required type="checkbox" /> I have permission to share this
          evidence and have identified my own contribution.
        </label>
        <details
          className="notice"
          aria-label="XP before submission"
          open={showPrediction}
        >
          <summary>Independent review is required for XP</summary>
          <p>
            {kind === "prediction"
              ? "A raw prediction earns no work XP merely for being posted. Standard outcomes: Normal +50 / -10 XP; High +150 / -50 XP with a 50 XP reserve."
              : kind === "correction"
                ? "Correcting your own error earns no additional correction XP. A verified improvement can receive only the difference to a higher work class."
                : "Verified useful work can earn 50, 150 or 300 XP according to its work class and remaining allowance. A later forecast is assessed separately."}
          </p>
          {showPrediction && (
            <p>
              {category === "Degens"
                ? "Degen memecoin predictions are currently unvalidated for outcome XP. You may save and share this call, but no outcome award is promised."
                : category === "Traders"
                  ? "Outcome eligibility requires matching BTC, ETH or SOL Coinbase Exchange Spot terms, at least 2:1 reward to downside, and an exact UTC-hour expiry within seven days. Missing or ambiguous history remains Inconclusive."
                  : "A baseline, measurable target, failure condition and future horizon are needed for outcome eligibility. Incomplete terms remain unvalidated."}
            </p>
          )}
          <Link className="inline-link" href="/xp">
            XP rules and limits
          </Link>
        </details>
        <button
          className="button"
          type="submit"
          disabled={!launchActive || data.evaluationAvailable === false}
        >
          <FilePlus2 size={16} />
          {busy
            ? "Saving..."
            : version
              ? kind === "update"
                ? "Submit updated version"
                : "Submit corrected version"
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
