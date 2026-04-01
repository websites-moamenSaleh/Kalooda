import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createSupabaseProxyClient } from "@/lib/supabase-proxy";
import { getSafeNextPath } from "@/lib/auth-redirect";

const PUBLIC_ROUTES = ["/", "/auth-error"];
const PUBLIC_PREFIXES = [
  "/delivery/accept/",
  "/api/",
  "/auth/callback",
  "/auth/sign-out",
];
const CUSTOMER_AUTH_PAGES = ["/sign-in", "/sign-up"];

function isPublicRoute(pathname: string): boolean {
  if (PUBLIC_ROUTES.includes(pathname)) return true;
  return PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

function isCustomerAuthPage(pathname: string): boolean {
  return CUSTOMER_AUTH_PAGES.includes(pathname);
}

function isAdminSignIn(pathname: string): boolean {
  return pathname === "/admin/sign-in";
}

function roleHomeCustomer(role: string | null): string {
  if (role === "admin" || role === "super_admin") return "/admin";
  return "/";
}

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const response = NextResponse.next({ request });

  async function refreshBothApiSessions() {
    const customer = createSupabaseProxyClient(request, response, "customer");
    await customer.auth.getClaims();
    const admin = createSupabaseProxyClient(request, response, "admin");
    await admin.auth.getClaims();
  }

  if (pathname.startsWith("/api/")) {
    await refreshBothApiSessions();
    return response;
  }

  if (isAdminSignIn(pathname)) {
    const supabase = createSupabaseProxyClient(request, response, "admin");
    const { data, error } = await supabase.auth.getClaims();
    const claims = !error && data ? data.claims : null;
    if (claims) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", claims.sub)
        .single();
      if (profile?.role === "admin" || profile?.role === "super_admin") {
        return NextResponse.redirect(new URL("/admin", request.url));
      }
    }
    return response;
  }

  if (isCustomerAuthPage(pathname)) {
    const supabase = createSupabaseProxyClient(request, response, "customer");
    const { data, error } = await supabase.auth.getClaims();
    const claims = !error && data ? data.claims : null;
    if (claims) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", claims.sub)
        .single();
      return NextResponse.redirect(
        new URL(roleHomeCustomer(profile?.role ?? null), request.url)
      );
    }
    return response;
  }

  if (isPublicRoute(pathname)) {
    const supabase = createSupabaseProxyClient(request, response, "customer");
    await supabase.auth.getClaims();
    return response;
  }

  const isAdminArea = pathname.startsWith("/admin");

  if (isAdminArea) {
    const supabase = createSupabaseProxyClient(request, response, "admin");
    const { data, error } = await supabase.auth.getClaims();
    const claims = !error && data ? data.claims : null;

    if (!claims) {
      const signInUrl = new URL("/admin/sign-in", request.url);
      const next = getSafeNextPath(pathname + request.nextUrl.search);
      if (next) signInUrl.searchParams.set("next", next);
      return NextResponse.redirect(signInUrl);
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", claims.sub)
      .single();

    if (!profile) {
      console.error("MISSING_PROFILE", { userId: claims.sub, pathname });
      return NextResponse.redirect(new URL("/auth-error", request.url));
    }

    const role = profile.role;

    if (pathname.startsWith("/admin/functions")) {
      if (role !== "super_admin") {
        const target = role === "admin" ? "/admin" : "/";
        return NextResponse.redirect(new URL(target, request.url));
      }
    } else if (role !== "admin" && role !== "super_admin") {
      return NextResponse.redirect(new URL("/", request.url));
    }

    return response;
  }

  const supabase = createSupabaseProxyClient(request, response, "customer");
  const { data, error } = await supabase.auth.getClaims();
  const claims = !error && data ? data.claims : null;

  if (!claims) {
    const signInUrl = new URL("/sign-in", request.url);
    const next = getSafeNextPath(pathname + request.nextUrl.search);
    if (next) signInUrl.searchParams.set("next", next);
    return NextResponse.redirect(signInUrl);
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", claims.sub)
    .single();

  if (!profile) {
    console.error("MISSING_PROFILE", { userId: claims.sub, pathname });
    return NextResponse.redirect(new URL("/auth-error", request.url));
  }

  if (profile.role === "admin" || profile.role === "super_admin") {
    return NextResponse.redirect(new URL("/admin", request.url));
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.json|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
