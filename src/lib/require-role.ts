import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import {
  adminAuthCookieOptions,
  customerAuthCookieOptions,
} from "@/lib/supabase-session";

type AuthResult =
  | { authorized: true; userId: string }
  | NextResponse;

function createRouteSupabase(request: NextRequest, audience: "admin" | "customer") {
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
        setAll() {
          // Route handlers cannot set cookies on the incoming request;
          // the proxy handles token refresh.
        },
      },
    }
  );
}

export async function requireRole(
  request: NextRequest,
  allowedRoles: ("admin" | "super_admin")[]
): Promise<AuthResult> {
  const supabase = createRouteSupabase(request, "admin");

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 }
    );
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile) {
    console.error("MISSING_PROFILE_API", {
      userId: user.id,
      path: request.nextUrl.pathname,
    });
    return NextResponse.json(
      { error: "Forbidden" },
      { status: 403 }
    );
  }

  if (!allowedRoles.includes(profile.role as "admin" | "super_admin")) {
    return NextResponse.json(
      { error: "Forbidden" },
      { status: 403 }
    );
  }

  return { authorized: true, userId: user.id };
}

/** Signed-in user with a profile row, using the storefront (customer) session cookie. */
export async function requireSession(
  request: NextRequest
): Promise<AuthResult> {
  const supabase = createRouteSupabase(request, "customer");

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 }
    );
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile) {
    console.error("MISSING_PROFILE_API", {
      userId: user.id,
      path: request.nextUrl.pathname,
    });
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (profile.role === "admin" || profile.role === "super_admin") {
    return NextResponse.json(
      { error: "Forbidden" },
      { status: 403 }
    );
  }

  return { authorized: true, userId: user.id };
}

export function isAuthorized(
  result: AuthResult
): result is { authorized: true; userId: string } {
  return "authorized" in result && result.authorized === true;
}
