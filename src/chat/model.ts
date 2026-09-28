import { z } from "zod";
export const reactionLabels = {
  like: "Like",
  thanks: "Thanks",
  insight: "Useful insight",
  question: "Question",
} as const;
export const roomId = z.string().regex(/^[a-z0-9-]{1,80}$/);
export const chatInput = z
  .object({
    room: roomId,
    request: z.uuid(),
    mutation: z.discriminatedUnion("action", [
      z
        .object({
          action: z.literal("send"),
          body: z.string().max(2000),
          reply: z.uuid().nullable(),
          attachments: z.array(z.uuid()).max(4),
        })
        .strict(),
      z
        .object({
          action: z.literal("edit"),
          message: z.uuid(),
          revision: z.uuid(),
          body: z.string().max(2000),
        })
        .strict(),
      z
        .object({
          action: z.literal("delete"),
          message: z.uuid(),
          revision: z.uuid(),
        })
        .strict(),
      z
        .object({
          action: z.literal("react"),
          message: z.uuid(),
          emoji: z.enum(["like", "thanks", "insight", "question"]),
          active: z.boolean(),
        })
        .strict(),
      z
        .object({
          action: z.literal("read"),
          sequence: z.number().int().positive().safe(),
        })
        .strict(),
    ]),
  })
  .strict();
export type ChatMutation = z.infer<typeof chatInput>["mutation"];
export type ChatMessage = {
  id: string;
  sequence: number;
  author: string;
  name: string;
  specialty: string;
  body: string;
  revision: string;
  deleted: boolean;
  edited: boolean;
  createdAt: string;
  reply: string | null;
  isDemo: boolean;
  sources: unknown;
  attachments: { id: string; type: string }[];
  reactions: {
    emoji: keyof typeof reactionLabels;
    count: number;
    mine: boolean;
  }[];
};
export type ChatSnapshot = {
  messages: ChatMessage[];
  hasOlder: boolean;
  readSequence: number;
  unread: Record<string, number>;
};
export function mergeMessages(
  previous: ChatMessage[],
  incoming: ChatMessage[],
) {
  const map = new Map(previous.map((m) => [m.id, m]));
  for (const message of incoming) map.set(message.id, message);
  return [...map.values()].sort((a, b) => a.sequence - b.sequence);
}
export const draftPrefix = "grindly:chat-draft:";
export const draftKey = (member: string, room: string) =>
  `${draftPrefix}${member}:${room}`;
export function shouldSend(event: {
  key: string;
  shiftKey: boolean;
  isComposing: boolean;
  keyCode: number;
}) {
  return (
    event.key === "Enter" &&
    !event.shiftKey &&
    !event.isComposing &&
    event.keyCode !== 229
  );
}
