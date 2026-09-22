import { z } from "zod";

const httpUrl = z
  .url()
  .refine((value) => ["http:", "https:"].includes(new URL(value).protocol));

const schema = z
  .object({
    GRINDLY_STAGE: z
      .enum(["foundation", "auth", "membership"])
      .default("foundation"),
    APP_URL: httpUrl.default("http://localhost:3000"),
    CHAIN_ID: z.coerce
      .number()
      .refine(
        (value) => value === 46630,
        "Expected Robinhood Chain testnet (46630)",
      )
      .default(46630),
    SUPABASE_URL: httpUrl.optional(),
    SUPABASE_PUBLISHABLE_KEY: z.string().min(1).optional(),
    SUPABASE_SECRET_KEY: z.string().min(1).optional(),
    ROBINHOOD_RPC_URL: httpUrl.optional(),
    MEMBERSHIP_CONTRACT_ADDRESS: z
      .string()
      .regex(/^0x[0-9a-fA-F]{40}$/)
      .optional(),
    ISSUER_PRIVATE_KEY: z
      .string()
      .regex(/^0x[0-9a-fA-F]{64}$/)
      .optional(),
  })
  .superRefine((env, ctx) => {
    const required: (keyof typeof env)[] = [];
    if (env.GRINDLY_STAGE !== "foundation")
      required.push(
        "SUPABASE_URL",
        "SUPABASE_PUBLISHABLE_KEY",
        "SUPABASE_SECRET_KEY",
      );
    if (env.GRINDLY_STAGE === "membership")
      required.push(
        "ROBINHOOD_RPC_URL",
        "MEMBERSHIP_CONTRACT_ADDRESS",
        "ISSUER_PRIVATE_KEY",
      );
    for (const key of required) {
      if (!env[key])
        ctx.addIssue({
          code: "custom",
          path: [key],
          message: "Required for this stage",
        });
    }
  });

export function parseEnvironment(input: Record<string, string | undefined>) {
  const result = schema.safeParse(input);
  if (!result.success) {
    // Never include input values: this error can reach build logs.
    const keys = [
      ...new Set(result.error.issues.map((issue) => issue.path.join("."))),
    ];
    throw new Error(`Invalid environment: ${keys.join(", ")}`);
  }
  return result.data;
}
