"use client";
import { useState, type ReactNode } from "react";
import { Search } from "lucide-react";

export function AlphaFeed({
  entries,
}: {
  entries: { id: string; search: string; status: string; content: ReactNode }[];
}) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const visible = entries.filter(
    (entry) =>
      (!status || entry.status === status) &&
      entry.search.toLowerCase().includes(query.trim().toLowerCase()),
  );
  return (
    <>
      <div className="alpha-filters">
        <label className="field">
          <span>
            <Search size={15} aria-hidden="true" /> Search alphas
          </span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <label className="field">
          <span>Review status</span>
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All statuses</option>
            <option value="pending">Pending review</option>
            <option value="accepted">Accepted</option>
            <option value="needs_correction">Needs correction</option>
            <option value="disputed">Disputed</option>
            <option value="rejected">Rejected</option>
          </select>
        </label>
      </div>
      <p className="muted" role="status">
        {visible.length} {visible.length === 1 ? "alpha" : "alphas"}
      </p>
      <div className="alpha-feed" aria-label="Shared alphas">
        {visible.map((entry) => (
          <div className="alpha-feed-entry" key={entry.id}>
            {entry.content}
          </div>
        ))}
      </div>
      {!visible.length && (
        <p className="empty-state">No alphas match this search.</p>
      )}
    </>
  );
}
