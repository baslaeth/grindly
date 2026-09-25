import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getEnvironment } from "@/server/environment";

export async function proxy(request: NextRequest) {
  const env = getEnvironment();
  let response = NextResponse.next({ request });
  response.headers.set("Cache-Control", "private, no-store");
  if (
    env.GRINDLY_STAGE === "foundation" ||
    !env.SUPABASE_URL ||
    !env.SUPABASE_PUBLISHABLE_KEY
  )
    return response;
  const auth = createServerClient(
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
        getAll: () => request.cookies.getAll(),
        setAll: (values) => {
          for (const { name, value } of values)
            request.cookies.set(name, value);
          response = NextResponse.next({ request });
          for (const { name, value, options } of values)
            response.cookies.set(name, value, options);
          response.headers.set("Cache-Control", "private, no-store");
        },
      },
    },
  );
  // Refresh cookies here; authorization remains in the server services.
  await auth.auth.getUser();
  return response;
}

export const config = {
  matcher: [
    "/join",
    "/workbench",
    "/findings/:path*",
    "/submit",
    "/review",
    "/contribution",
    "/membership",
  ],
};
