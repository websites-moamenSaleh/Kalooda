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
          ? "border-primary bg-rose-50 shadow-md"
          : "border-stone-200 bg-white hover:border-rose-300"
      }`}
    >
      <span className="text-3xl">{categoryEmoji[category.slug] ?? "🍪"}</span>
      <span className={`text-sm font-semibold ${isActive ? "text-primary" : "text-stone-700"}`}>
        {name}
      </span>
    </button>
  );
}
