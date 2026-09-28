import { z } from "zod";
import { ranks } from "@/research/spaces";
export type Opportunity = {
  id: string;
  name: string;
  description: string;
  kind: string;
  ranks: string[];
  requirements: string;
  approvalRequired: boolean;
  status: string;
  startsAt: string | null;
  endsAt: string | null;
  action: "details" | "external" | "register" | "interest" | "claim";
  isDemo: boolean;
};
const text = (min: number, max: number) => z.string().trim().min(min).max(max);
export const opportunityInput = z.union([
  z.object({ action: z.enum(["state", "participate"]), id: z.uuid() }).strict(),
  z
    .object({ action: z.literal("manage"), operation: z.literal("list") })
    .strict(),
  z
    .object({
      action: z.literal("manage"),
      operation: z.literal("requirement"),
      data: z
        .object({
          id: z.uuid(),
          member: z.uuid(),
          approved: z.boolean(),
          reason: text(10, 1000),
        })
        .strict(),
    })
    .strict(),
  z
    .object({
      action: z.literal("manage"),
      operation: z.literal("save"),
      data: z
        .object({
          id: z.uuid().optional(),
          name: text(3, 100),
          description: text(10, 1000),
          kind: text(2, 60),
          ranks: z.array(z.enum(ranks)).min(1).max(5),
          requirements: text(0, 1000),
          approvalRequired: z.boolean(),
          status: z.enum(["draft", "open", "closed"]),
          startsAt: z.iso.datetime().nullable(),
          endsAt: z.iso.datetime().nullable(),
          publicVisible: z.boolean(),
          action: z.enum(["details", "external", "register", "interest"]),
          url: z.union([
            z.literal(""),
            z
              .url()
              .max(1000)
              .refine((v) => new URL(v).protocol === "https:"),
          ]),
        })
        .strict(),
    })
    .strict(),
]);
export function participationReason(
  card: Opportunity,
  rank: string | null,
  isDemo: boolean,
  requirementApproved: boolean,
  now = Date.now(),
) {
  if (!rank) return "Verified NFT membership required";
  if (card.isDemo !== isDemo)
    return "Participation is isolated to sample accounts";
  if (!card.ranks.includes(rank))
    return `Eligible ranks: ${card.ranks.join(", ")}`;
  if (
    card.status !== "open" ||
    (card.startsAt && Date.parse(card.startsAt) > now) ||
    (card.endsAt && Date.parse(card.endsAt) <= now)
  )
    return "Participation is not open";
  if (card.approvalRequired && !requirementApproved)
    return "Additional requirements need operator verification";
  return null;
}
