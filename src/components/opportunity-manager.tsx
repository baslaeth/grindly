"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ranks } from "@/research/spaces";
import { opportunityRequest } from "./opportunity-card";
type Managed = {
  id: string;
  name: string;
  description: string;
  kind: string;
  eligible_ranks: string[];
  requirements: string;
  approval_required: boolean;
  status: string;
  starts_at: string | null;
  ends_at: string | null;
  public_visible: boolean;
  action_type: string;
  protected_url: string | null;
};
export function OpportunityManager() {
  const router = useRouter();
  const [items, setItems] = useState<Managed[]>([]);
  const [selected, setSelected] = useState<Managed | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState("");
  async function load() {
    try {
      setItems(
        await opportunityRequest({ action: "manage", operation: "list" }),
      );
    } catch {
      setError("Unable to load operator records.");
    }
  }
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setSaved("");
    const f = new FormData(e.currentTarget);
    const get = (s: string) => String(f.get(s) ?? "");
    try {
      await opportunityRequest({
        action: "manage",
        operation: "save",
        data: {
          ...(selected ? { id: selected.id } : {}),
          name: get("name"),
          description: get("description"),
          kind: get("kind"),
          ranks: f.getAll("ranks"),
          requirements: get("requirements"),
          approvalRequired: f.has("approval") || !!get("requirements").trim(),
          status: get("status"),
          startsAt: get("start")
            ? new Date(`${get("start")}Z`).toISOString()
            : null,
          endsAt: get("end") ? new Date(`${get("end")}Z`).toISOString() : null,
          publicVisible: f.has("visible"),
          action: get("action"),
          url: get("url"),
        },
      });
      setSaved("Opportunity saved.");
      await load();
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <details
      className="section opportunity-management"
      onToggle={(e) => {
        if (e.currentTarget.open) void load();
      }}
    >
      <summary>Manage opportunities</summary>
      <label className="field">
        Opportunity
        <select
          value={selected?.id ?? ""}
          onChange={(e) => {
            setSelected(items.find((i) => i.id === e.target.value) ?? null);
            setSaved("");
          }}
        >
          <option value="">New draft</option>
          {items.map((i) => (
            <option key={i.id} value={i.id}>
              {i.name}
            </option>
          ))}
        </select>
      </label>
      <form
        key={selected?.id ?? "new"}
        onSubmit={submit}
        className="research-form"
      >
        <label className="field">
          Name
          <input
            name="name"
            required
            minLength={3}
            maxLength={100}
            defaultValue={selected?.name}
          />
        </label>
        <label className="field">
          Description
          <textarea
            name="description"
            required
            minLength={10}
            maxLength={1000}
            defaultValue={selected?.description}
          />
        </label>
        <label className="field">
          Type
          <input
            name="kind"
            required
            minLength={2}
            maxLength={60}
            defaultValue={selected?.kind}
          />
        </label>
        <fieldset>
          <legend>Eligible ranks</legend>
          {ranks.map((r) => (
            <label key={r}>
              <input
                type="checkbox"
                name="ranks"
                value={r}
                defaultChecked={selected?.eligible_ranks.includes(r)}
              />
              {r}
            </label>
          ))}
        </fieldset>
        <label className="field">
          Additional requirements (operator verification required)
          <textarea
            name="requirements"
            maxLength={1000}
            defaultValue={selected?.requirements}
          />
        </label>
        <label>
          <input
            type="checkbox"
            name="approval"
            defaultChecked={selected?.approval_required}
          />
          Operator must verify additional requirements
        </label>
        <label className="field">
          Action
          <select
            name="action"
            defaultValue={selected?.action_type ?? "details"}
          >
            <option value="details">Details only</option>
            <option value="external">Official campaign</option>
            <option value="register">Registration required</option>
            <option value="interest">Express interest</option>
          </select>
        </label>
        <label className="field">
          Protected campaign URL
          <input
            name="url"
            type="url"
            defaultValue={selected?.protected_url ?? ""}
          />
        </label>
        <label className="field">
          Status
          <select name="status" defaultValue={selected?.status ?? "draft"}>
            <option value="draft">Draft</option>
            <option value="open">Open</option>
            <option value="closed">Closed</option>
          </select>
        </label>
        <label className="field">
          Starts (UTC)
          <input
            name="start"
            type="datetime-local"
            defaultValue={selected?.starts_at?.slice(0, 16)}
          />
        </label>
        <label className="field">
          Ends (UTC)
          <input
            name="end"
            type="datetime-local"
            defaultValue={selected?.ends_at?.slice(0, 16)}
          />
        </label>
        <label>
          <input
            type="checkbox"
            name="visible"
            defaultChecked={selected?.public_visible}
          />
          Publish public card
        </label>
        <button className="button" disabled={busy}>
          {busy ? "Saving..." : "Save opportunity"}
        </button>
      </form>
      {selected && (
        <details>
          <summary>Verify participation requirements</summary>
          <form
            className="research-form"
            onSubmit={async (e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              setError("");
              try {
                await opportunityRequest({
                  action: "manage",
                  operation: "requirement",
                  data: {
                    id: selected.id,
                    member: f.get("member"),
                    reason: f.get("reason"),
                    approved: f.has("approved"),
                  },
                });
                setSaved("Requirement assessment recorded.");
              } catch {
                setError(
                  "Unable to record assessment. Check authority and member details.",
                );
              }
            }}
          >
            <label className="field">
              Member ID
              <input required name="member" />
            </label>
            <label className="field">
              Evidence and reason
              <textarea
                required
                name="reason"
                minLength={10}
                maxLength={1000}
              />
            </label>
            <label>
              <input type="checkbox" name="approved" />
              Requirements verified
            </label>
            <button className="button">Record assessment</button>
          </form>
        </details>
      )}
      {saved && <p role="status">{saved}</p>}
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
    </details>
  );
}
