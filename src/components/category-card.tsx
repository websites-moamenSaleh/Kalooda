"use client";

import { Category } from "@/types/database";
import { useLanguage } from "@/contexts/language-context";

interface CategoryCardProps {
  category: Category;
  isActive: boolean;
  onClick: () => void;
}

const categoryEmoji: Record<string, string> = {
  chocolates: "🍫",
  gummies: "🍬",
  "hard-candy": "🍭",
  pastries: "🥐",
};

export function CategoryCard({ category, isActive, onClick }: CategoryCardProps) {
  const { locale } = useLanguage();
  const name = locale === "ar" && category.name_ar ? category.name_ar : category.name;

  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-2 rounded-2xl border-2 px-5 py-4 transition-all hover:scale-105 ${
        isActive
          ? "border-[#1F443C] bg-[#1F443C] shadow-lg text-white"
          : "border-stone-200 bg-white text-stone-700 hover:border-[#1F443C]/40 hover:bg-stone-50"
      }`}
    >
      <span className="text-3xl">{categoryEmoji[category.slug] ?? "🍰"}</span>
      <span className={`text-sm font-semibold ${isActive ? "text-[#D3A94C]" : "text-stone-700"}`}>
        {name}
      </span>
    </button>
  );
}
