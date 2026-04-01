import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getSafeNextPath } from "@/lib/auth-redirect";
import type { AuthAudience } from "@/lib/supabase-session";

export async function handleAuthOAuthCallback(
  request: NextRequest,
  audience: AuthAudience
) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const next = getSafeNextPath(searchParams.get("next"));

  if (code) {
    const supabase = await createSupabaseServerClient(audience);
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();

        const role = profile?.role;

        if (audience === "customer") {
          if (role === "admin" || role === "super_admin") {
            await supabase.auth.signOut();
            return NextResponse.redirect(
              new URL("/sign-in?error=adminPortal", request.url)
            );
          }
          const target = next ?? "/";
          return NextResponse.redirect(new URL(target, origin));
        }

        if (role !== "admin" && role !== "super_admin") {
          await supabase.auth.signOut();
          return NextResponse.redirect(
            new URL("/admin/sign-in?error=forbidden", request.url)
          );
        }

        const target = next ?? "/admin";
        return NextResponse.redirect(new URL(target, origin));
      }
    }
  }

  const errPath =
    audience === "admin"
      ? "/admin/sign-in?error=oauth"
      : "/sign-in?error=oauth";
  return NextResponse.redirect(new URL(errPath, request.url));
}
