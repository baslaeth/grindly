import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";
import type { ResearchData } from "@/research/model";
import { RankProgression } from "@/components/rank-progression";
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
import { AirdropFollowing } from "@/components/airdrop-following";
import { Watchlist } from "@/components/watchlist";

function member(tier = "Bronze", available = 75): ResearchData {
  return {
    token: { tier },
    launchAvailable: true,
    launchProgress: { available, applied: 0, reserved: 0 },
    profiles: [],
    findings: [],
    versions: [],
    alphas: [],
    follows: [],
    airdropFollowing: [],
    airdropNotifications: [],
  } as unknown as ResearchData;
}
it("shows five ranks, one current rank, the approved threshold and inactive execution", () => {
  const html = renderToStaticMarkup(
    createElement(RankProgression, { data: member() }),
  );
  for (const rank of ["Bronze", "Silver", "Gold", "Platinum", "Diamond"])
    expect(html).toContain(rank);
  expect(html.match(/aria-current="step"/g)).toHaveLength(1);
  expect(html).toContain("1,500 XP");
  expect(html).toContain("1,425 XP remaining");
  expect(html).toContain("Upgrade execution is inactive");
  expect(html).not.toContain("10 rank-only rooms");
  expect(html).not.toContain("Every rank includes its own ten rooms");
});
it("preserves signed losses and never invents a Diamond next tier", () => {
  const negative = renderToStaticMarkup(
    createElement(RankProgression, { data: member("Gold", -50) }),
  );
  expect(negative).toContain("-50");
  expect(negative).toContain("4,550 XP remaining");
  expect(negative).toContain('value="0"');
  const diamond = renderToStaticMarkup(
    createElement(RankProgression, { data: member("Diamond") }),
  );
  expect(diamond).toContain("Diamond is the final rank");
  expect(diamond).not.toContain("<progress");
});
it("does not show an eligible progress bar for unavailable or unreconciled balances", () => {
  const data = member();
  data.launchAvailable = false;
  expect(
    renderToStaticMarkup(createElement(RankProgression, { data })),
  ).not.toContain("<progress");
  data.launchAvailable = true;
  data.launchProgress!.unreconciledHistory = true;
  const html = renderToStaticMarkup(createElement(RankProgression, { data }));
  expect(html).toContain("Provisional progression XP");
  expect(html).not.toContain("<progress");
});
function followed(): ResearchData {
  const data = member();
  data.airdropFollowing = ["first", "second"].map((followId) => ({
    followId,
    campaign: "same",
    name: "One campaign",
    url: "https://example.org/official",
    status: "no_confirmed_change",
    lastSuccessAt: null,
    nextDue: "2026-10-08T12:00:00Z",
    types: [],
    paused: false,
  }));
  data.follows = [
    { id: "first", finding_id: "alpha" },
  ] as ResearchData["follows"];
  data.airdropNotifications = [
    {
      id: "notice",
      status: "done",
      event: {
        campaign_id: "same",
        is_demo: true,
        detected_at: "2026-10-07T12:00:00Z",
        announced_at: null,
        scheduled_at: null,
        observed_available_at: null,
        kind: "claim_open",
        required_action: "Historical replay only",
        source_url: "https://example.org/official",
        passage: "Dated example",
      },
    },
  ] as ResearchData["airdropNotifications"];
  return data;
}
it("groups shared campaign monitoring without merging per-guide alert preferences", () => {
  const html = renderToStaticMarkup(
    createElement(AirdropFollowing, { data: followed() }),
  );
  expect(html.match(/<strong>One campaign<\/strong>/g)).toHaveLength(1);
  expect(html.match(/Save alert preferences/g)).toHaveLength(2);
  expect(html).toContain("2 followed guides");
  expect(html).toContain("Next due:");
  expect(html).toContain("Scheduled opening announcement");
});
it("connects campaign notifications to the followed guide without claiming a current opening", () => {
  const html = renderToStaticMarkup(
    createElement(Watchlist, { data: followed() }),
  );
  expect(html).toContain("Sample announcement replay");
  expect(html).not.toContain("Latest material change: None confirmed");
  expect(html).toContain('href="#airdrop-updates"');
});
