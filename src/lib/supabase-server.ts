import { createServerClient } from "@supabase/ssr";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import {
  adminAuthCookieOptions,
  customerAuthCookieOptions,
  type AuthAudience,
} from "@/lib/supabase-session";

export async function createSupabaseServerClient(
  audience: AuthAudience = "customer"
) {
  const cookieStore = await cookies();
  const cookieOptions =
    audience === "admin" ? adminAuthCookieOptions : customerAuthCookieOptions;

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions,
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // setAll can fail in Server Components where the response
            // is already streaming. The proxy handles token refresh so
            // this is safe to swallow.
          }
        },
      },
    }
  );
}

let _adminClient: SupabaseClient | undefined;

export function getSupabaseAdmin(): SupabaseClient {
  if (!_adminClient) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error(
        "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY"
      );
    }
    _adminClient = createClient(supabaseUrl, serviceRoleKey);
  }
  return _adminClient;
}

/** @deprecated Use getSupabaseAdmin() instead */
export const supabaseAdmin = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    return (getSupabaseAdmin() as unknown as Record<string | symbol, unknown>)[
      prop
    ];
  },
});
