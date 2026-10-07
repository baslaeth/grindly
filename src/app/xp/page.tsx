import Link from "next/link";
import { Screen } from "@/components/screen";
import { launchPolicy as p } from "@/launch/policy";
import { RankBadges } from "@/components/rank-progression";

export const metadata = { title: "How XP and ranks work" };
const examples = [
  [
    "Whitelist Hunters",
    "Verified eligibility and tested access steps.",
    "A registered access criterion is met by its deadline.",
  ],
  [
    "Airdrop Hunters",
    "A tested guide earns work credit now; verified requirement changes may earn update credit.",
    "A defined claim becomes available to participants meeting the registered conditions.",
  ],
  [
    "Presale Hunters",
    "Supported terms, vesting and risk research before listing.",
    "A registered result with accessible liquidity and locked allocations accounted for.",
  ],
  [
    "Degens",
    "New verified useful evidence, not a raw call.",
    "Memecoin price calls are currently unvalidated for outcome XP.",
  ],
  [
    "Traders",
    "Original, verified useful market research.",
    "Eligible Coinbase spot entry, target and stop events in their actual order.",
  ],
  [
    "Project Analysts",
    "Supported product, user and risk analysis earns work credit now.",
    "Only a measurable future claim waits for its registered checkpoint.",
  ],
  [
    "Seed and Early Stage Investors",
    "Useful public diligence and milestones before a financial outcome exists.",
    "Registered milestones; financial outcomes may remain pending for years.",
  ],
  [
    "NFT Specialists",
    "Verified collection research or a tested mint guide.",
    "A defined liquid checkpoint, not one suspicious sale.",
  ],
  [
    "Meta Catchers",
    "Supported connections between dated evidence and emerging themes.",
    "A defined adoption, usage or demand metric, not vague popularity.",
  ],
];

export default function XpGuide() {
  let total = 0;
  return (
    <Screen title="How XP and ranks work">
      <RankBadges />
      <p>
        Share useful alpha in any category in your rank. Saving creates a
        record, not an award. An authorized independent reviewer checks
        accuracy, originality and usefulness. You cannot approve your own work.
      </p>
      <p className="muted">
        Published launch rules, version {p.version}. This guide is not your live
        balance.{" "}
        <Link className="inline-link" href="/membership">
          See My Profile
        </Link>{" "}
        for recorded awards and available progress.
      </p>
      <section className="section">
        <h2>Work earns credit now</h2>
        <div className="xp-award-grid">
          <article>
            <strong>{p.work.actionable} XP:</strong> verified actionable find,
            warning, correction or material update.
          </article>
          <article>
            <strong>{p.work.tested} XP:</strong> tested guide or focused
            original research.
          </article>
          <article>
            <strong>{p.work.substantial} XP:</strong> substantial original
            analysis or complete tested workflow.
          </article>
        </div>
        <p>
          One work award per contribution. An improvement from 150 to 300 earns
          only the additional 150. Fixing your own error earns no correction
          reward. Likes, length and posting frequency do not establish quality.
        </p>
        <p>
          Useful long-term research can earn work XP while its forecast remains
          Pending. Honest work credit can remain when a prediction fails; proven
          copying or fabricated evidence can lead to a recorded reversal.
        </p>
      </section>
      <details className="section">
        <summary>Prediction rewards, reservations and earning limits</summary>
        <section>
          <h2>Predictions settle later</h2>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Prediction</th>
                  <th>Normal success / failure</th>
                  <th>High success / failure</th>
                </tr>
              </thead>
              <tbody>
                {(["standard", "enhanced"] as const).map((key) => (
                  <tr key={key}>
                    <th>
                      {key === "standard" ? "Standard" : "Approved long-term"}
                    </th>
                    <td>
                      +{p.prediction[key].normal.met} /{" "}
                      {p.prediction[key].normal.failed} XP
                    </td>
                    <td>
                      +{p.prediction[key].high.met} /{" "}
                      {p.prediction[key].high.failed} XP
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p>
            High reserves {p.prediction.standard.high.reserve} unused XP for a
            standard call or {p.prediction.enhanced.high.reserve} for an
            approved long-term call. It is released once on settlement or
            authorized cancellation. Losses remain signed and can reduce
            available progress below zero.
          </p>
          <p>
            Approved long-term calls require a baseline, meaningful measurable
            target, failure criteria, at least 30 days and independent approval
            before scoring starts. Longer waiting alone does not qualify.
            Original terms and policy are frozen; amendments are dated.
          </p>
          <p>
            Public research, private lead, claimed insider and Unknown describe
            sources, not commitment. An insider label proves no access and earns
            no bonus.
          </p>
          <details>
            <summary>Eligibility and current price coverage</summary>
            <p>
              Incomplete predictions can be saved as unvalidated, with no
              promised outcome XP. Ordered price scoring currently supports
              matching BTC, ETH or SOL Coinbase Exchange spot paths, an exact
              UTC-hour expiry within seven days, and complete history. Net
              potential reward must be at least twice declared downside.
              Leverage never increases XP. Other venues, derivatives and Degen
              memecoins are unvalidated.
            </p>
            <p>
              Scoring starts after entry. No trigger by expiry is Cancelled
              without outcome XP. Target before invalidation is Met;
              invalidation first or a demonstrably missed target at expiry is
              Failed. Ambiguous order or missing history is Inconclusive, not a
              guessed success or failure.
            </p>
          </details>
        </section>
        <section className="section">
          <h2>Limits, simply</h2>
          <ul>
            <li>
              {p.newAlphasPerUtcDay} new formal alphas per member per UTC day.
              Chat, corrections and material updates remain available.
            </li>
            <li>
              {p.ordinaryXpPerUtcWeek} ordinary positive XP per UTC week, Monday
              through Sunday, including work awards and standard wins. Negative
              XP always applies and does not reopen this allowance.
            </li>
            <li>
              {p.enhancedActiveLimit} active approved long-term forecasts. Their
              outcome bonuses sit outside the ordinary weekly cap.
            </li>
            <li>
              At most {p.materialUpdateXpPerOpportunityWeek} XP for material
              updates per opportunity per week.
            </li>
          </ul>
          <p>
            Above-cap work retains attribution and history, with no automatic
            carryover. Changing category, wallet or NFT does not reset personal
            limits.
          </p>
        </section>
      </details>
      <section className="section">
        <h2>Rank progression</h2>
        <ol className="rank-path" aria-label="Membership ranks">
          {["Bronze", "Silver", "Gold", "Platinum", "Diamond"].map((rank) => (
            <li key={rank}>{rank}</li>
          ))}
        </ol>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Upgrade</th>
                <th>Additional unused XP required</th>
                <th>Total applied from Bronze</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(p.upgrade).map(([rank, amount], i) => {
                total += amount;
                return (
                  <tr key={rank}>
                    <th>
                      {rank} to {["Silver", "Gold", "Platinum", "Diamond"][i]}
                    </th>
                    <td>{amount.toLocaleString("en-US")}</td>
                    <td>{total.toLocaleString("en-US")}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p>
          Personal XP and history stay with the person. The NFT retains its tier
          when transferred. A holder of a purchased Gold NFT needs 4,500 of
          their own unused progression XP to reach Platinum; the seller&apos;s
          progress does not transfer.
        </p>
        <p>
          Available progress is net earned progression minus XP already applied
          to upgrades and active High reservations. Neither can be reused. Extra
          progress carries forward; completed upgrades are not automatically
          reversed by later losses. Diamond has no next rank.
        </p>
        <p className="notice">
          Upgrade execution is inactive while burn parameters and transaction
          integration remain unresolved. Claim $GRIND is visible in My Profile
          but inactive. XP is not a token balance.
        </p>
      </section>
      <section className="section">
        <h2>What can I share?</h2>
        {examples.map(([category, now, later]) => (
          <details key={category}>
            <summary>{category}</summary>
            <p>
              <strong>Work now:</strong> {now}
            </p>
            <p>
              <strong>Outcome later:</strong> {later}
            </p>
          </details>
        ))}
      </section>
      <section className="section">
        <h2>After you save</h2>
        <p>
          Your receipt links to the original version, permitted same-rank
          sharing, source checks and review status. Grind Intelligence explains
          retrieved evidence and gaps. Source or model failures do not erase
          your alpha. Unstaffed work stays awaiting independent review; recorded
          decisions, awards and later outcomes appear in My Profile.
        </p>
        <Link className="button" href="/workbench">
          Open Hub
        </Link>
      </section>
    </Screen>
  );
}
