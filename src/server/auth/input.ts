import { createHash } from "node:crypto";
import { z } from "zod";

export const normalizedEmail = z
  .string()
  .trim()
  .toLowerCase()
  .max(254)
  .pipe(z.email());
export const invitationCode = z
  .string()
  .trim()
  .regex(/^[0-9a-f]{64}$/);
export const otpRequest = z.discriminatedUnion("mode", [
  z
    .object({
      mode: z.literal("join"),
      email: normalizedEmail,
      invitation: invitationCode,
    })
    .strict(),
  z.object({ mode: z.literal("returning"), email: normalizedEmail }).strict(),
]);
export const otpVerification = z
  .object({ code: z.string().regex(/^[0-9]{6}$/) })
  .strict();
export const intentSchema = z
  .object({
    email: normalizedEmail,
    invitationHash: z
      .string()
      .regex(/^[0-9a-f]{64}$/)
      .optional(),
  })
  .strict();

export function hashInvitation(code: string) {
  return createHash("sha256").update(code, "utf8").digest("hex");
}
