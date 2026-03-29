"use client";

import { useState, useEffect } from "react";
import { CategoryCard } from "@/components/category-card";
import { ProductCard } from "@/components/product-card";
import { Header } from "@/components/header";
import { CartDrawer } from "@/components/cart-drawer";
import { Chatbot } from "@/components/chatbot";
import { Search, Loader2 } from "lucide-react";
import { useLanguage } from "@/contexts/language-context";
import type { Category, Product } from "@/types/database";

export default function HomePage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [cartOpen, setCartOpen] = useState(false);
  const { t } = useLanguage();

  useEffect(() => {
    Promise.all([
      fetch("/api/categories").then((r) => r.json()),
      fetch("/api/products").then((r) => r.json()),
    ])
      .then(([cats, prods]) => {
        setCategories(cats);
        setProducts(prods);
      })
      .catch((err) => console.error("Failed to load data:", err))
      .finally(() => setLoading(false));
  }, []);

  const filtered = products.filter((p) => {
    const matchesCategory = !activeCategory || p.category_id === activeCategory;
    const matchesSearch =
      !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.description.toLowerCase().includes(search.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <>
      <Header onCartClick={() => setCartOpen(true)} />
      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        {/* Hero */}
        <section className="mb-10 text-center">
          <h1 className="text-4xl font-extrabold tracking-tight text-stone-900 sm:text-5xl">
            {t("heroTitle1")}{" "}
            <span className="text-primary">{t("heroTitle2")}</span>
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-lg text-stone-500">
            {t("heroSubtitle")}
          </p>
        </section>

        {loading ? (
          <div className="flex flex-col items-center py-20 text-stone-400">
            <Loader2 className="h-8 w-8 animate-spin" />
            <p className="mt-3 text-sm">{t("loadingProducts")}</p>
          </div>
        ) : (
          <>
            {/* Search */}
            <div className="relative mx-auto mb-8 max-w-lg">
              <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t("searchPlaceholder")}
                className="w-full rounded-xl border border-stone-200 bg-white py-2.5 ps-10 pe-4 text-sm outline-none placeholder:text-stone-400 focus:border-primary focus:ring-2 focus:ring-primary/20 shadow-sm"
              />
            </div>

            {/* Categories */}
            <div className="mb-8 flex flex-wrap justify-center gap-3">
              <button
                onClick={() => setActiveCategory(null)}
                className={`rounded-2xl border-2 px-5 py-3 text-sm font-semibold transition-all hover:scale-105 ${
                  !activeCategory
                    ? "border-primary bg-rose-50 text-primary shadow-md"
                    : "border-stone-200 bg-white text-stone-700 hover:border-rose-300"
                }`}
              >
                {t("all")}
              </button>
              {categories.map((cat) => (
                <CategoryCard
                  key={cat.id}
                  category={cat}
                  isActive={activeCategory === cat.id}
                  onClick={() =>
                    setActiveCategory((prev) =>
                      prev === cat.id ? null : cat.id
                    )
                  }
                />
              ))}
            </div>

            {/* Product grid */}
            {filtered.length === 0 ? (
              <p className="py-16 text-center text-stone-400">
                {t("noProducts")}
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {filtered.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
            )}
          </>
        )}
      </main>

      <Chatbot />
    </>
  );
}
