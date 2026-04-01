import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";
import {
  adminAuthCookieOptions,
  customerAuthCookieOptions,
  type AuthAudience,
} from "@/lib/supabase-session";

export function createSupabaseProxyClient(
  request: NextRequest,
  response: NextResponse,
  audience: AuthAudience
) {
  const cookieOptions =
    audience === "admin" ? adminAuthCookieOptions : customerAuthCookieOptions;

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions,
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );
}
