"use client";

import { Category } from "@/types/database";
import { useLanguage } from "@/contexts/language-context";
import { isHttpUrl } from "@/lib/is-http-url";

interface CategoryCardProps {
  category: Category;
  isActive: boolean;
  onClick: () => void;
  variant?: "default" | "compact";
  /** Larger footprint for the homepage Menu section. */
  size?: "default" | "large";
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
  size = "default",
}: CategoryCardProps) {
  const { locale } = useLanguage();
  const name =
    locale === "ar" && category.name_ar ? category.name_ar : category.name;
  const emoji = categoryEmoji[category.slug] ?? "🍰";
  const url = category.image_url?.trim() ?? "";
  const showImage = url.length > 0 && isHttpUrl(url);

  if (variant === "compact") {
    return (
      <button
        type="button"
        aria-pressed={isActive}
        onClick={onClick}
        className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2.5 text-xs font-semibold transition-all duration-200 sm:text-sm ${
          isActive
            ? "border-[#D3A94C] bg-[#0A2923] text-[#FFEC94] shadow-md"
            : "surface-panel border-[#1F443C]/10 text-ink hover:border-[#D3A94C]/35"
        }`}
      >
        {showImage ? (
          // eslint-disable-next-line @next/next/no-img-element -- category image from storage
          <img
            src={url}
            alt=""
            className="h-7 w-7 shrink-0 rounded-md object-cover"
          />
        ) : (
          <span className="text-lg leading-none">{emoji}</span>
        )}
        <span className="max-w-[8rem] truncate sm:max-w-[10rem]">{name}</span>
      </button>
    );
  }

  const large = size === "large";
  const frameClass = large
    ? "w-[9.25rem] rounded-2xl sm:w-[10.75rem] md:w-[11.75rem] lg:w-[12.5rem]"
    : "w-[7.5rem] rounded-xl sm:w-[8.5rem]";

  return (
    <button
      type="button"
      aria-pressed={isActive}
      onClick={onClick}
      className={`group flex flex-col overflow-hidden border-2 p-0 transition-all duration-200 ${frameClass} ${
        isActive
          ? "border-[#D3A94C] bg-[#0A2923] text-[#F0F5F3] shadow-[0_10px_32px_rgba(10, 41, 35,0.28)]"
          : "surface-panel border-[#1F443C]/12 text-ink hover:-translate-y-0.5 hover:border-[#D3A94C]/4 hover:shadow-[var(--shadow-card)]"
      }`}
    >
      <div
        className={`relative aspect-square w-full shrink-0 overflow-hidden bg-gradient-to-br from-[#EBE0D4] via-[#E5D9CC] to-[#DDD0C2] ${
          isActive ? "ring-1 ring-inset ring-[#D3A94C]/25" : ""
        }`}
      >
        {showImage ? (
          // eslint-disable-next-line @next/next/no-img-element -- category image from storage
          <img
            src={url}
            alt=""
            className={`h-full w-full object-cover ${
              isActive
                ? ""
                : "transition-transform duration-200 group-hover:scale-105"
            }`}
          />
        ) : (
          <span
            className={`flex h-full w-full items-center justify-center transition-transform duration-200 ${
              large
                ? "text-5xl sm:text-6xl md:text-[3.35rem]"
                : "text-4xl sm:text-5xl"
            } ${isActive ? "" : "group-hover:scale-110"}`}
          >
            {emoji}
          </span>
        )}
      </div>
      <span
        className={`text-center font-semibold leading-tight ${
          large
            ? "px-2.5 py-3 text-sm sm:px-3 sm:py-3.5 sm:text-base"
            : "px-2 py-2.5 text-sm sm:px-2.5 sm:py-3"
        } ${isActive ? "text-[#FFEC94]" : "text-ink"}`}
      >
        {name}
      </span>
    </button>
  );
}
