import type { Locale } from "@/lib/translations";

/** Cookie read by the server layout and written by the client when the user switches language. */
export const LOCALE_COOKIE_NAME = "sweetdrop_locale";

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

export function parseLocaleCookie(value: string | undefined | null): Locale {
  return value === "ar" ? "ar" : "en";
}

/** Value for `document.cookie` (non–HttpOnly so the client can set it). */
export function clientLocaleCookieHeader(locale: Locale): string {
  return `${LOCALE_COOKIE_NAME}=${locale}; Path=/; Max-Age=${ONE_YEAR_SECONDS}; SameSite=Lax`;
}
