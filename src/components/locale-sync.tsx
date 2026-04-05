"use client";

import { useEffect, useRef } from "react";
import { useAuth } from "@/contexts/auth-context";
import { useLanguage } from "@/contexts/language-context";
import { getSupabaseCustomerBrowser } from "@/lib/supabase-client-customer";
import type { Locale } from "@/lib/translations";

/**
 * Syncs the active locale with the user's DB preference.
 * - On login: applies preferred_language from the profile.
 * - On locale change: saves the new locale back to the profile.
 */
export function LocaleSync() {
  const { profile } = useAuth();
  const { locale, setLocale } = useLanguage();
  const supabase = getSupabaseCustomerBrowser();
  const syncedRef = useRef(false);

  // Apply DB preference when the profile first loads.
  useEffect(() => {
    if (!profile) {
      syncedRef.current = false;
      return;
    }
    const pref = profile.preferred_language;
    if ((pref === "en" || pref === "ar") && pref !== locale) {
      setLocale(pref as Locale);
    }
    syncedRef.current = true;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id]);

  // Save locale to DB whenever it changes (after initial sync).
  useEffect(() => {
    if (!syncedRef.current || !profile) return;
    supabase
      .from("profiles")
      .update({ preferred_language: locale })
      .eq("id", profile.id)
      .then(({ error }: { error: unknown }) => {
        if (error) console.error("Failed to save locale preference:", error);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locale]);

  return null;
}
