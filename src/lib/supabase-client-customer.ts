import { createBrowserClient } from "@supabase/ssr";
import { customerAuthCookieOptions } from "@/lib/supabase-session";

let client: ReturnType<typeof createBrowserClient> | undefined;

export function getSupabaseCustomerBrowser() {
  if (!client) {
    client = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        isSingleton: false,
        cookieOptions: customerAuthCookieOptions,
      }
    );
  }
  return client;
}
