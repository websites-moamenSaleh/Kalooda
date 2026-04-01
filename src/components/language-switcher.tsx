"use client";

import { useLanguage } from "@/contexts/language-context";
import { Globe } from "lucide-react";

interface LanguageSwitcherProps {
  className?: string;
}

export function LanguageSwitcher({ className }: LanguageSwitcherProps) {
  const { locale, setLocale, t } = useLanguage();

  return (
    <button
      onClick={() => setLocale(locale === "en" ? "ar" : "en")}
      className={
        className ??
        "flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-[#F5E6C8]/75 hover:text-[#D3A94C] hover:bg-white/5 transition-colors"
      }
      aria-label="Switch language"
    >
      <Globe className="h-4 w-4" />
      <span>{t("switchLanguage")}</span>
    </button>
  );
}
