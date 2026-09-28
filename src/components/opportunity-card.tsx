"use client";
import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight, LockKeyhole } from "lucide-react";
import type { Opportunity } from "@/opportunities/model";
export async function opportunityRequest(payload: unknown) {
  const response = await fetch("/api/opportunities", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await response.json();
  if (!response.ok)
    throw new Error(data.error?.message ?? "Unable to save. Please retry.");
  return data;
}
export function OpportunityCard({
  card,
  locked,
  signedIn,
  registration,
}: {
  card: Opportunity;
  locked: string | null;
  signedIn: boolean;
  registration?: string;
}) {
  const [status, setStatus] = useState(registration ?? "");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function participate() {
    setBusy(true);
    setError("");
    try {
      const result = await opportunityRequest({
        action: "participate",
        id: card.id,
      });
      if (result.url) {
        const url = new URL(result.url);
        if (url.protocol === "https:") window.location.assign(url.toString());
      }
      setStatus(result.registration ?? result.message ?? "");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <article className="opportunity-card">
      <div className="byline">
        <span className="status-label">{card.kind}</span>
        <span>{card.status}</span>
        {card.isDemo && <span className="sample-label">Fictional sample</span>}
      </div>
      <h3>{card.name}</h3>
      <p>{card.description}</p>
      <dl>
        <dt>Eligible ranks</dt>
        <dd>{card.ranks.join(", ")}</dd>
        {card.endsAt && (
          <>
            <dt>Deadline</dt>
            <dd>
              {new Date(card.endsAt)
                .toISOString()
                .slice(0, 16)
                .replace("T", " ")}{" "}
              UTC
            </dd>
          </>
        )}
      </dl>
      <details>
        <summary>Details</summary>
        <p>{card.requirements || "Verified membership in a listed rank."}</p>
        {card.isDemo && (
          <p>
            Fictional demonstration only. No real partnership, application,
            claim or allocation.
          </p>
        )}
      </details>
      {card.action !== "details" &&
        (!signedIn ? (
          <Link className="button secondary" href="/join">
            Sign in
          </Link>
        ) : locked ? (
          <p className="participation-locked">
            <LockKeyhole size={16} />
            {locked}
          </p>
        ) : (
          <button
            className="button"
            disabled={busy || !!status}
            onClick={() => void participate()}
          >
            {busy
              ? "Checking..."
              : status
                ? "Recorded"
                : card.action === "interest"
                  ? "Express interest"
                  : card.action === "register"
                    ? "Register"
                    : card.action === "claim"
                      ? "Open verified claim"
                      : "Official campaign"}
            <ArrowUpRight size={16} />
          </button>
        ))}
      {status && (
        <p role="status">
          {card.isDemo ? "Sample status: " : "Status: "}
          {status}
        </p>
      )}
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
    </article>
  );
}
