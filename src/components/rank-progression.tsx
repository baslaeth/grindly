import Link from "next/link";
import {
  Award,
  Shield,
  ShieldCheck,
  Gem,
  Crown,
  LockKeyhole,
} from "lucide-react";
import { ranks, nextRank } from "@/research/spaces";
import { launchPolicy } from "@/launch/policy";
import type { ResearchData } from "@/research/model";

const icons = [Shield, ShieldCheck, Award, Crown, Gem];

export function RankBadges({ current }: { current?: string }) {
  return (
    <ol className="rank-collection" aria-label="Membership ranks">
      {ranks.map((rank, i) => {
        const Icon = icons[i] ?? Shield;
        return (
          <li
            key={rank}
            className={`rank-tile rank-${rank.toLowerCase()}`}
            aria-current={rank === current ? "step" : undefined}
          >
            <span className="rank-emblem">
              <Icon size={28} strokeWidth={1.7} aria-hidden="true" />
            </span>
            <strong>{rank}</strong>
            <span>
              {rank === current ? "Your current rank" : "10 rank-only rooms"}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

export function RankProgression({ data }: { data: ResearchData }) {
  const rank = data.token.tier;
  const next = nextRank(rank);
  const required = next
    ? launchPolicy.upgrade[rank as keyof typeof launchPolicy.upgrade]
    : null;
  const progress = data.launchAvailable ? data.launchProgress : undefined;
  const usable = progress && !progress.unreconciledHistory;
  return (
    <section className="rank-progression" aria-label="Your NFT progression">
      <div className="section-heading">
        <h2>Your NFT progression</h2>
        <Link className="inline-link" href="/xp">
          How XP and ranks work
        </Link>
      </div>
      <dl className="metrics progression-metrics">
        <div>
          <dt>Current rank</dt>
          <dd>{rank}</dd>
        </div>
        <div>
          <dt>
            {progress?.unreconciledHistory
              ? "Provisional progression XP"
              : "Available progression XP"}
          </dt>
          <dd>
            {progress?.available.toLocaleString("en-US") ?? "Unavailable"}
          </dd>
        </div>
        <div>
          <dt>{next ? `Next: ${next}` : "Highest rank"}</dt>
          <dd>
            {required ? `${required.toLocaleString("en-US")} XP` : "Diamond"}
          </dd>
        </div>
      </dl>
      {next && required && usable ? (
        <div className="progress-summary">
          <progress
            aria-label={`Progress toward ${next}`}
            max={required}
            value={Math.max(0, Math.min(progress.available, required))}
          />
          <p>
            <strong>
              {Math.max(0, required - progress.available).toLocaleString(
                "en-US",
              )}{" "}
              XP remaining
            </strong>{" "}
            for {next}. Applied XP and High reservations are already excluded.
          </p>
        </div>
      ) : (
        <p>
          {!next
            ? "Diamond is the final rank."
            : progress?.unreconciledHistory
              ? "Earlier upgrade accounting needs reconciliation before this balance can be used."
              : "Live progression is temporarily unavailable. Published requirements are unchanged."}
        </p>
      )}
      <RankBadges current={rank} />
      <p className="rank-utility">
        Every rank includes its own ten rooms. Share in any category, inspect
        permitted evidence and follow opportunities you qualify for. Silver
        members can initiate scoped peer requests.
      </p>
      <details>
        <summary>Progression accounting and membership rules</summary>
        {progress && (
          <dl className="metrics">
            <div>
              <dt>Already applied to upgrades</dt>
              <dd>{progress.applied}</dd>
            </div>
            <div>
              <dt>Reserved for High predictions</dt>
              <dd>{progress.reserved}</dd>
            </div>
          </dl>
        )}
        <p>
          Available progress is net earned XP minus applied XP and active High
          reservations. Losses can reduce it below zero; completed upgrades are
          not automatically reversed.
        </p>
        <p>
          Your personal XP and contribution history stay with you. A transferred
          NFT keeps its tier, not its previous holder&apos;s XP. Personal and
          delegated credit are not combined.
        </p>
      </details>
      <p className="availability-note">
        <LockKeyhole size={15} aria-hidden="true" /> Upgrade execution is
        inactive. Token burn requirements and transaction integration are not
        finalized.
      </p>
    </section>
  );
}
