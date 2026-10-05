"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { alphaCategories } from "@/alpha/model";
import type { ResearchData } from "@/research/model";

export function ReviewerAppointments({ data }: { data: ResearchData }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const actorDemo = data.profiles.find((p) => p.member_id === data.memberId)?.is_demo === true;
  const candidates = (data.directory ?? []).filter((p) => p.id !== data.memberId && p.is_demo === actorDemo);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setNotice("");
    const form = event.currentTarget;
    const fields = new FormData(form);
    try {
      const response = await fetch("/api/alpha", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "appointReviewer", candidate: fields.get("candidate"), category: fields.get("category"), scope: fields.get("scope"), grant: fields.get("operation") === "grant" }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error?.message ?? "Could not update reviewer scope.");
      setNotice("Reviewer scope updated and pending work rechecked.");
      router.refresh();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Reviewer scope unavailable.");
    } finally { setBusy(false); }
  }
  return <section className="section" aria-label="Reviewer appointments">
    <h2>Reviewer appointments</h2>
    <p>Grant a category scope only to an independent member in this verified rank. Their specialty alone gives no review authority.</p>
    <form className="research-form" onSubmit={submit}>
      <fieldset disabled={busy || !candidates.length}>
        <label className="field">Member<select name="candidate" required defaultValue=""><option value="" disabled>Choose a member</option>{candidates.map((p) => <option key={p.id} value={p.id}>{p.name}{p.is_demo ? " (sample)" : ""}</option>)}</select></label>
        <label className="field">Category<select name="category" required>{alphaCategories.map((category) => <option key={category}>{category}</option>)}</select></label>
        <label className="field">Explicit review scope<input name="scope" required minLength={10} maxLength={500} placeholder="Evidence and decision boundaries" /></label>
        <label className="field">Action<select name="operation"><option value="grant">Appoint</option><option value="revoke">Revoke</option></select></label>
        <button className="button" type="submit">{busy ? "Saving..." : "Save reviewer scope"}</button>
      </fieldset>
    </form>
    {!candidates.length && <p>No compatible member is available in this rank.</p>}
    {notice && <p role="status">{notice}</p>}
    {!!data.launchReviewerScopes?.length && <details><summary>Current scoped reviewers ({data.launchReviewerScopes.length})</summary><ul>
      {data.launchReviewerScopes.map((scope) => <li key={`${scope.member_id}:${scope.category}:${scope.rank}`}>
        {candidates.find((p) => p.id === scope.member_id)?.name ?? "Member"}: {scope.category} / {scope.rank} / {scope.scope}
      </li>)}
    </ul></details>}
  </section>;
}
