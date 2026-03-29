"use client";

import { useLanguage } from "@/contexts/language-context";
import { Globe } from "lucide-react";

export function LanguageSwitcher() {
  const { locale, setLocale, t } = useLanguage();

  return (
    <button
      onClick={() => setLocale(locale === "en" ? "ar" : "en")}
      className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-stone-600 hover:bg-stone-100 transition-colors"
      aria-label="Switch language"
    >
      <Globe className="h-4 w-4" />
      <span>{t("switchLanguage")}</span>
    </button>
  );
}
