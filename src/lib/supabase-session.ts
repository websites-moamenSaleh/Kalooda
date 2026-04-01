import type { CookieOptionsWithName } from "@supabase/ssr";

export type AuthAudience = "customer" | "admin";

/** Distinct storage/cookie namespaces so storefront and admin sessions do not clobber each other. */
export const CUSTOMER_AUTH_COOKIE_NAME = "sb-customer-auth";
export const ADMIN_AUTH_COOKIE_NAME = "sb-admin-auth";

export const customerAuthCookieOptions: CookieOptionsWithName = {
  name: CUSTOMER_AUTH_COOKIE_NAME,
};

export const adminAuthCookieOptions: CookieOptionsWithName = {
  name: ADMIN_AUTH_COOKIE_NAME,
};

export function parseAuthAudience(
  raw: string | null | undefined
): AuthAudience | null {
  if (raw === "customer" || raw === "admin") return raw;
  return null;
}
