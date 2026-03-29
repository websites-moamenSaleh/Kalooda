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

export function ProductCard({ product }: { product: Product }) {
  const { addItem } = useCart();
  const { t } = useLanguage();

  return (
    <div className="group relative flex flex-col rounded-2xl border border-stone-200 bg-white p-4 shadow-sm transition-all hover:shadow-lg hover:-translate-y-0.5">
      <div className="mb-3 flex h-32 items-center justify-center rounded-xl bg-gradient-to-br from-rose-50 to-amber-50">
        <span className="text-6xl drop-shadow-sm">
          {productEmoji[product.id] ?? "🍬"}
        </span>
      </div>

      <h3 className="text-base font-semibold text-stone-900 leading-tight">
        {product.name}
      </h3>
      <p className="mt-1 text-sm text-stone-500 line-clamp-2">
        {product.description}
      </p>

      {product.allergens.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {product.allergens.map((a) => (
            <span
              key={a}
              className="inline-flex items-center gap-0.5 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-800"
            >
              <ShieldAlert className="h-3 w-3" />
              {a}
            </span>
          ))}
        </div>
      )}

      <div className="mt-auto flex items-center justify-between pt-3">
        <span className="text-lg font-bold text-primary">
          ${product.price.toFixed(2)}
        </span>
        <button
          onClick={() => addItem(product)}
          className="flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-primary-dark transition-colors active:scale-95"
        >
          <Plus className="h-4 w-4" />
          {t("add")}
        </button>
      </div>
    </div>
  );
}
