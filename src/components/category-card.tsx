"use client";

import { Category } from "@/types/database";
import { useLanguage } from "@/contexts/language-context";

interface CategoryCardProps {
  category: Category;
  isActive: boolean;
  onClick: () => void;
  variant?: "default" | "compact";
}

const categoryEmoji: Record<string, string> = {
  chocolates: "🍫",
  gummies: "🍬",
  "hard-candy": "🍭",
  pastries: "🥐",
};

export function CategoryCard({
  category,
  isActive,
  onClick,
  variant = "default",
}: CategoryCardProps) {
  const { locale } = useLanguage();
  const name =
    locale === "ar" && category.name_ar ? category.name_ar : category.name;
  const emoji = categoryEmoji[category.slug] ?? "🍰";

  if (variant === "compact") {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2.5 text-xs font-semibold transition-all duration-200 sm:text-sm ${
          isActive
            ? "border-[#D3A94C] bg-[#0A2923] text-[#FFEC94] shadow-md"
            : "surface-panel border-[#1F443C]/10 text-ink hover:border-[#D3A94C]/35"
        }`}
      >
        <span className="text-lg leading-none">{emoji}</span>
        <span className="max-w-[8rem] truncate sm:max-w-[10rem]">{name}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={`group flex min-w-[7.5rem] flex-col items-center gap-2 rounded-xl border-2 px-5 py-4 transition-all duration-200 sm:min-w-[8.5rem] sm:px-6 sm:py-5 ${
        isActive
          ? "border-[#D3A94C] bg-[#0A2923] text-[#F0F5F3] shadow-[0_10px_32px_rgba(10, 41, 35,0.28)]"
          : "surface-panel border-[#1F443C]/12 text-ink hover:-translate-y-0.5 hover:border-[#D3A94C]/4 hover:shadow-[var(--shadow-card)]"
      }`}
    >
      <span
        className={`text-3xl transition-transform duration-200 sm:text-4xl ${
          isActive ? "" : "group-hover:scale-110"
        }`}
      >
        {emoji}
      </span>
      <span
        className={`text-center text-sm font-semibold leading-tight ${
          isActive ? "text-[#FFEC94]" : "text-ink"
        }`}
      >
        {name}
      </span>
    </button>
  );
}
