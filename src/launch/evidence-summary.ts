import type { AlphaSnapshot, AlphaVersion, CheckedSource } from "@/alpha/model";
import { supportsCoinbaseSpot } from "./settlement";

// These are deterministic term/coverage checks, never AI interpretations.
export function launchEvidenceIssues(
  alpha: AlphaVersion,
  terms: NonNullable<AlphaSnapshot["launchTerms"]>[number],
  sources: CheckedSource[],
) {
  const issues: string[] = [];
  const p = terms.prediction;
  if (p && ["Traders", "Degens"].includes(alpha.category)) {
    const entry = Number(p.entry),
      stop = Number(p.stop),
      target = Number(p.target);
    if (![entry, stop, target].every((v) => Number.isFinite(v) && v > 0))
      issues.push(
        "Entry, stop and target need positive numeric values; outcome XP is unvalidated.",
      );
    else if (
      p.direction === "long"
        ? !(stop < entry && target > entry)
        : p.direction === "short"
          ? !(target < entry && stop > entry)
          : true
    )
      issues.push(
        "The registered direction, entry, stop and target conflict. Amend the terms; do not infer an executed trade.",
      );
    else if (Math.abs(target - entry) < 2 * Math.abs(entry - stop))
      issues.push(
        "Registered reward is below twice the downside, before costs. Outcome XP is unvalidated.",
      );
    if (!supportsCoinbaseSpot(alpha.subject, terms.context, alpha.category))
      issues.push(
        alpha.category === "Degens"
          ? "Degen memecoin calls are not supported for ordered outcome XP. Current pair observations cannot settle their predictions."
          : "Subject, Asset, Coinbase Exchange venue and Spot instrument must match a supported BTC, ETH or SOL pair. This record is outside that scoring coverage.",
      );
    if (alpha.horizon && new Date(alpha.horizon).getUTCMinutes() !== 0)
      issues.push(
        "The deadline is not an exact UTC hour; the available ordered candle path cannot score it.",
      );
  }
  for (const source of sources.filter((s) => s.status !== "retrieved"))
    issues.push(
      `${source.label}: no usable verified observation. Inspect its retrieval limits or add an accessible primary source.`,
    );
  if (p && alpha.horizon)
    issues.push(
      `The registered horizon is ${alpha.horizon}. A current quote is not proof of the later outcome; complete dated observations and independent review are still needed.`,
    );
  if (!sources.length)
    issues.push(
      "Sources have not completed a saved check yet. Refresh sources without resubmitting the alpha.",
    );
  return issues;
}
