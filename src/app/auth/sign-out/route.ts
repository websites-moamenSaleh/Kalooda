import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import {
  adminAuthCookieOptions,
  customerAuthCookieOptions,
  parseAuthAudience,
  type AuthAudience,
} from "@/lib/supabase-session";

async function readAudience(request: NextRequest): Promise<AuthAudience> {
  try {
    const body = (await request.json()) as { audience?: string };
    const a = parseAuthAudience(body?.audience);
    if (a) return a;
  } catch {
    /* ignore */
  }
  const q = request.nextUrl.searchParams.get("audience");
  const fromQuery = parseAuthAudience(q);
  return fromQuery ?? "customer";
}

export async function POST(request: NextRequest) {
  const audience = await readAudience(request);
  const cookieOptions =
    audience === "admin" ? adminAuthCookieOptions : customerAuthCookieOptions;

  const redirectPath =
    audience === "admin" ? "/admin/sign-in" : "/sign-in";
  const res = NextResponse.redirect(new URL(redirectPath, request.url));

  const supabase = createServerClient(
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
            res.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  await supabase.auth.signOut();
  return res;
}
