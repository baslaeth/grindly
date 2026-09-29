"use client";
import { useState, type ReactNode } from "react";
type HistoryItem = {
  id: string;
  pending: boolean;
  corrected: boolean;
  due: boolean;
  observed: boolean;
  content: ReactNode;
};
export function HistoryFilters({
  groups,
}: {
  groups: { category: string; summary: ReactNode; records: HistoryItem[] }[];
}) {
  const [category, setCategory] = useState("");
  const [filter, setFilter] = useState<
    "all" | "pending" | "corrected" | "due" | "observed"
  >("all");
  const visible = groups
    .filter((g) => !category || g.category === category)
    .map((g) => ({
      ...g,
      records: g.records.filter((r) => filter === "all" || r[filter]),
    }));
  return (
    <>
      <div className="form-grid">
        <label className="field">
          Category history filter
          <select
            aria-label="Category history filter"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="">All categories</option>
            {groups.map((g) => (
              <option key={g.category}>{g.category}</option>
            ))}
          </select>
        </label>
        <label className="field">
          Record filter
          <select
            aria-label="Record filter"
            value={filter}
            onChange={(e) => setFilter(e.target.value as typeof filter)}
          >
            <option value="all">All records</option>
            <option value="pending">Pending review</option>
            <option value="corrected">Has corrections</option>
            <option value="due">Declared horizon reached</option>
            <option value="observed">Has later observations</option>
          </select>
        </label>
      </div>
      {!visible.some((g) => g.records.length) && (
        <p>No records match these filters.</p>
      )}
      {visible
        .filter((g) => g.records.length)
        .map((g) => (
          <details key={g.category}>
            <summary>
              {g.category}: {g.records.length} shown
            </summary>
            {g.summary}
            {g.records.map((r) => (
              <div key={r.id}>{r.content}</div>
            ))}
          </details>
        ))}
    </>
  );
}
