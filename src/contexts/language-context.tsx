"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  startTransition,
  type ReactNode,
} from "react";
import { translations, type Locale, type TranslationKey } from "@/lib/translations";
import {
  LOCALE_COOKIE_NAME,
  clientLocaleCookieHeader,
} from "@/lib/locale-preference";

interface LanguageContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: TranslationKey) => string;
  dir: "ltr" | "rtl";
}

const LanguageContext = createContext<LanguageContextType | null>(null);

function hasLocaleCookie(): boolean {
  if (typeof document === "undefined") return true;
  return document.cookie
    .split(";")
    .some((c) => c.trim().startsWith(`${LOCALE_COOKIE_NAME}=`));
}

export function LanguageProvider({
  children,
  initialLocale,
}: {
  children: ReactNode;
  initialLocale: Locale;
}) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);

  // Backfill cookie + align state when only localStorage exists (legacy).
  useEffect(() => {
    try {
      if (hasLocaleCookie()) return;
      const saved = localStorage.getItem("locale") as Locale | null;
      const fromStorage: Locale | null =
        saved === "en" || saved === "ar" ? saved : null;
      const resolved: Locale = fromStorage ?? initialLocale;
      if (fromStorage && fromStorage !== initialLocale) {
        startTransition(() => {
          setLocaleState(fromStorage);
        });
      }
      document.cookie = clientLocaleCookieHeader(resolved);
      localStorage.setItem("locale", resolved);
    } catch {
      /* private mode / no storage */
    }
  }, [initialLocale]);

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = locale === "ar" ? "rtl" : "ltr";
  }, [locale]);

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    try {
      localStorage.setItem("locale", newLocale);
      document.cookie = clientLocaleCookieHeader(newLocale);
    } catch {
      /* ignore */
    }
  }, []);

  const t = useCallback(
    (key: TranslationKey) => translations[locale][key],
    [locale]
  );

  const dir = locale === "ar" ? "rtl" : "ltr";

  return (
    <LanguageContext.Provider value={{ locale, setLocale, t, dir }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx)
    throw new Error("useLanguage must be used within LanguageProvider");
  return ctx;
}
