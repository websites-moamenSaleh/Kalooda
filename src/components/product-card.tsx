"use client";

import { Product } from "@/types/database";
import { useCart } from "@/contexts/cart-context";
import { useLanguage } from "@/contexts/language-context";
import { Plus, ShieldAlert } from "lucide-react";

const productEmoji: Record<string, string> = {
  "prod-1": "🍫",
  "prod-2": "🍉",
  "prod-3": "🌰",
  "prod-4": "🍑",
  "prod-5": "🍭",
  "prod-6": "🍯",
  "prod-7": "🥮",
  "prod-8": "🍓",
};

function isHttpUrl(s: string) {
  try {
    const u = new URL(s);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

export function ProductCard({ product }: { product: Product }) {
  const { addItem } = useCart();
  const { t, locale } = useLanguage();

  const name =
    locale === "ar" && product.name_ar ? product.name_ar : product.name;
  const description =
    locale === "ar" && product.description_ar
      ? product.description_ar
      : product.description;

  const emoji = productEmoji[product.id] ?? "🍰";
  const showImage =
    product.image_url && isHttpUrl(product.image_url.trim());

  return (
    <article
      className="group surface-panel flex flex-col overflow-hidden rounded-xl border border-[#1F443C]/10 transition-all duration-300 hover:-translate-y-1 hover:border-[#D3A94C]/25 hover:shadow-[var(--shadow-elevated)]"
    >
      <div className="relative aspect-[5/4] overflow-hidden bg-gradient-to-br from-[#EBE0D4] via-[#E5D9CC] to-[#DDD0C2]">
        {showImage ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element -- admin-supplied arbitrary URLs */}
            <img
              src={product.image_url.trim()}
              alt={name}
              className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
            />
            <div
              className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#082018]/50 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"
              aria-hidden
            />
          </>
        ) : (
          <>
            <div
              className="absolute inset-0 flex items-center justify-center"
              aria-hidden
            >
              <span className="text-6xl drop-shadow-md transition-transform duration-300 group-hover:scale-110 sm:text-7xl">
                {emoji}
              </span>
            </div>
            <div
              className="pointer-events-none absolute inset-0 opacity-[0.07]"
              aria-hidden
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%231F443C' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
              }}
            />
          </>
        )}
      </div>

      <div className="flex flex-1 flex-col p-4 sm:p-5">
        <h3 className="font-display text-lg font-semibold leading-snug text-ink sm:text-xl">
          {name}
        </h3>
        <p className="mt-2 min-h-[2.5rem] text-sm leading-relaxed text-ink-soft line-clamp-2">
          {description}
        </p>

        {product.allergens.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {product.allergens.map((a) => (
              <span
                key={a}
                className="inline-flex items-center gap-1 rounded-md border border-[#946E2A]/25 bg-[#FFF8E6] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#946E2A]"
              >
                <ShieldAlert className="h-3 w-3 shrink-0" />
                {a}
              </span>
            ))}
          </div>
        )}

        <div className="mt-auto flex items-end justify-between gap-3 border-t border-[#1F443C]/8 pt-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-soft/70">
              {t("price")}
            </p>
            <p className="font-display text-2xl font-bold text-primary-dark">
              ₪{product.price.toFixed(2)}
            </p>
          </div>
          <button
            type="button"
            onClick={() => addItem(product)}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-[#0A2923] px-4 py-2.5 text-sm font-bold text-[#FFEC94] shadow-md transition-all hover:bg-[#082018] hover:shadow-lg active:scale-[0.97]"
          >
            <Plus className="h-4 w-4" />
            {t("add")}
          </button>
        </div>
      </div>
    </article>
  );
}
