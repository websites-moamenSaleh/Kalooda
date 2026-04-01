import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { customerAuthCookieOptions } from "@/lib/supabase-session";

/**
 * Returns the storefront user from request cookies (same source as API routes).
 * Used to sync React auth UI when the browser Supabase client cannot read the session cookie.
 */
export async function GET(request: NextRequest) {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: customerAuthCookieOptions,
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll() {
          /* route handler: cookies come from the request only */
        },
      },
    }
  );

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return NextResponse.json({ user: null });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role === "admin" || profile?.role === "super_admin") {
    return NextResponse.json({ user: null });
  }

  return NextResponse.json({
    user: { id: user.id, email: user.email ?? null },
  });
}
