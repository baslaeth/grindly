export const ranks = [
  "Bronze",
  "Silver",
  "Gold",
  "Platinum",
  "Diamond",
] as const;
export type Rank = (typeof ranks)[number];
export function nextRank(rank: string) {
  const index = ranks.indexOf(rank as Rank);
  return index < 0 ? null : (ranks[index + 1] ?? null);
}
export const categories = [
  "Whitelist Hunters",
  "Airdrop Hunters",
  "Presale Hunters",
  "Degens",
  "Traders",
  "Project Analysts",
  "Seed and Early Stage Investors",
  "NFT Specialists",
  "Meta Catchers",
] as const;

export const acquisitionLabel = {
  newly_issued: "Newly issued",
  progressed: "Progressed",
  purchased: "Purchased (recorded)",
  unknown: "Unknown provenance; transfer is not proof of purchase",
} as const;
