import "server-only";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/types/database";
import { getEnvironment } from "./environment";
import { ServiceError } from "./errors";

export function getAuthEnvironment() {
  const env = getEnvironment();
  if (
    env.GRINDLY_STAGE === "foundation" ||
    !env.SUPABASE_URL ||
    !env.SUPABASE_PUBLISHABLE_KEY ||
    !env.SUPABASE_SECRET_KEY
  ) {
    throw new ServiceError(
      "AUTH_UNAVAILABLE",
      "Sign-in is temporarily unavailable.",
      503,
      true,
    );
  }
  return {
    ...env,
    SUPABASE_URL: env.SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY: env.SUPABASE_PUBLISHABLE_KEY,
    SUPABASE_SECRET_KEY: env.SUPABASE_SECRET_KEY,
  };
}

export function createDataClient() {
  const env = getAuthEnvironment();
  return createClient<Database>(env.SUPABASE_URL, env.SUPABASE_SECRET_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }),
    },
  });
}

export async function createAuthClient(readOnly = false) {
  const env = getAuthEnvironment();
  const cookieStore = await cookies();
  return createServerClient<Database>(
    env.SUPABASE_URL,
    env.SUPABASE_PUBLISHABLE_KEY,
    {
      cookieOptions: {
        httpOnly: true,
        sameSite: "lax",
        secure: new URL(env.APP_URL).protocol === "https:",
        path: "/",
      },
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (values) => {
          if (readOnly) return;
          for (const { name, value, options } of values)
            cookieStore.set(name, value, options);
        },
      },
      global: {
        fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }),
      },
    },
  );
}
