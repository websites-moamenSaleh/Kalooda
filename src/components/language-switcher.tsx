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
        "flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-[#E5EDE8]/80 transition-colors hover:bg-white/[0.06] hover:text-[#FFEC94]"
      }
      aria-label="Switch language"
    >
      <Globe className="h-4 w-4" />
      <span>{t("switchLanguage")}</span>
    </button>
  );
}
