"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { CategoryCard } from "@/components/category-card";
import { ProductCard } from "@/components/product-card";
import { Header } from "@/components/header";
import { CartDrawer } from "@/components/cart-drawer";
import { Chatbot } from "@/components/chatbot";
import { SiteFooter } from "@/components/site-footer";
import { Search, Sparkles } from "lucide-react";
import { useLanguage } from "@/contexts/language-context";
import { useAuth } from "@/contexts/auth-context";
import { useCartDrawerEvent } from "@/hooks/use-cart-drawer-event";
import type { Category, Product } from "@/types/database";

export default function HomePage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [cartOpen, setCartOpen] = useState(false);
  const { t } = useLanguage();
  const { user } = useAuth();

  useCartDrawerEvent(setCartOpen);

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

  const available = useMemo(
    () => products.filter((p) => !p.unavailable_today),
    [products]
  );

  const filtered = available.filter((p) => {
    const matchesCategory =
      !activeCategory || p.category_id === activeCategory;
    const q = search.toLowerCase();
    const matchesSearch =
      !search ||
      p.name.toLowerCase().includes(q) ||
      p.description?.toLowerCase().includes(q) ||
      p.name_ar?.toLowerCase().includes(q) ||
      p.description_ar?.toLowerCase().includes(q);
    return matchesCategory && matchesSearch;
  });

  const featuredPick = useMemo(() => available.slice(0, 4), [available]);

  const showFeaturedBlock = !search.trim() && !activeCategory && (loading || featuredPick.length > 0);

  return (
    <>
      <Header onCartClick={() => setCartOpen(true)} />

      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />

      <main>
        {/* Hero */}
        <section className="relative overflow-hidden border-b border-[#1F443C]/10">
          <div
            className="absolute inset-0 bg-[#082018]"
            aria-hidden
          />
          <div
            className="absolute inset-0 opacity-40 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(211, 169, 76,0.35),transparent),radial-gradient(ellipse_60%_50%_at_100%_50%,rgba(92,40,52,0.2),transparent)]"
            aria-hidden
          />
          <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24 lg:py-28">
            <div className="mx-auto max-w-3xl text-center">
              <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#D3A94C]/30 bg-[#D3A94C]/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-[#FFEC94]">
                <Sparkles className="h-3.5 w-3.5" />
                Kalooda
              </p>
              <h1 className="font-display text-4xl font-semibold leading-[1.1] tracking-tight text-[#F0F5F3] sm:text-5xl lg:text-6xl">
                {t("heroTitle1")}{" "}
                <span className="text-gradient-gold italic">
                  {t("heroTitle2")}
                </span>
              </h1>
              <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-[#A8B5AD] sm:text-lg">
                {t("heroSubtitle")}
              </p>
              <div className="mt-10 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                <a href="#browse" className="btn-primary-solid px-8 py-3.5">
                  {t("browseMenu")}
                </a>
                <a href="#categories" className="btn-outline-light px-8 py-3.5">
                  {t("viewCategories")}
                </a>
                <button
                  type="button"
                  onClick={() => setCartOpen(true)}
                  className="btn-outline-light px-8 py-3.5"
                >
                  {t("orderNow")}
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Categories */}
        <section
          id="categories"
          className="border-b border-[#1F443C]/8 bg-gradient-to-b from-[#fcfaf5] to-[#f0e9dd] py-16 sm:py-20"
        >
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="font-display text-3xl font-semibold text-ink sm:text-4xl">
                {t("sectionCategoriesTitle")}
              </h2>
              <div className="divider-gold mx-auto mt-4 max-w-xs" />
            </div>
            <div className="mt-12 flex flex-wrap justify-center gap-3 sm:gap-4">
              {loading ? (
                <>
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="h-12 w-28 animate-pulse rounded-xl bg-[#1F443C]/8" />
                  ))}
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => setActiveCategory(null)}
                    className={`rounded-xl border-2 px-5 py-3 text-sm font-semibold transition-all duration-200 sm:px-6 sm:py-3.5 ${
                      !activeCategory
                        ? "border-[#D3A94C] bg-[#0A2923] text-[#FFEC94] shadow-[0_8px_28px_rgba(10, 41, 35,0.25)]"
                        : "surface-panel border-[#1F443C]/12 text-ink hover:border-[#D3A94C]/35"
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
                </>
              )}
            </div>
          </div>
        </section>

        {/* Featured selections */}
        {showFeaturedBlock && (
          <section className="border-b border-[#1F443C]/8 bg-[#faf6ef] py-16 sm:py-20">
            <div className="mx-auto max-w-7xl px-4 sm:px-6">
              <div className="text-center">
                <h2 className="font-display text-3xl font-semibold text-ink sm:text-4xl">
                  {t("sectionSelectionsTitle")}
                </h2>
                <div className="divider-gold mx-auto mt-4 max-w-xs" />
                <p className="mx-auto mt-4 max-w-2xl text-ink-soft">
                  {t("sectionSelectionsSubtitle")}
                </p>
              </div>
              <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                {loading ? (
                  [...Array(4)].map((_, i) => (
                    <div key={i} className="aspect-[5/4] animate-pulse rounded-xl bg-[#1F443C]/8" />
                  ))
                ) : (
                  featuredPick.map((p) => (
                    <ProductCard key={p.id} product={p} />
                  ))
                )}
              </div>
            </div>
          </section>
        )}

        {/* CTA band */}
        <section className="surface-dark border-b border-[#D3A94C]/15 py-14 sm:py-16">
          <div className="mx-auto max-w-7xl px-4 text-center sm:px-6">
            <h2 className="font-display text-2xl font-semibold text-[#F0F5F3] sm:text-3xl">
              {t("ctaBandTitle")}
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-[#A8B5AD]">
              {t("ctaBandSubtitle")}
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              {user ? (
                <Link
                  href="/account"
                  className="btn-primary-solid min-w-[200px]"
                >
                  {t("myProfile")}
                </Link>
              ) : (
                <Link
                  href="/sign-in"
                  className="btn-primary-solid min-w-[200px]"
                >
                  {t("signIn")}
                </Link>
              )}
              <a href="#browse" className="btn-outline-light min-w-[200px]">
                {t("browseMenu")}
              </a>
            </div>
          </div>
        </section>

        {/* Browse / menu */}
        <section
          id="browse"
          className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-20"
        >
          <div className="text-center">
            <h2 className="font-display text-3xl font-semibold text-ink sm:text-4xl">
              {t("browseMenu")}
            </h2>
            <div className="divider-gold mx-auto mt-4 max-w-xs" />
          </div>

          <div className="relative mx-auto mt-10 max-w-xl">
            <Search className="pointer-events-none absolute start-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8B7355]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("searchPlaceholder")}
              className="input-premium w-full py-3.5 ps-12 pe-4 text-[15px] shadow-sm"
            />
          </div>

          <div className="mt-8 flex flex-wrap justify-center gap-2 sm:gap-3 lg:hidden">
            {loading ? (
              [...Array(4)].map((_, i) => (
                <div key={i} className="h-9 w-20 animate-pulse rounded-lg bg-[#1F443C]/8" />
              ))
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setActiveCategory(null)}
                  className={`rounded-lg border px-4 py-2.5 text-xs font-semibold sm:text-sm ${
                    !activeCategory
                      ? "border-[#D3A94C] bg-[#0A2923] text-[#FFEC94]"
                      : "surface-panel border-[#1F443C]/10 text-ink"
                  }`}
                >
                  {t("all")}
                </button>
                {categories.map((cat) => (
                  <CategoryCard
                    key={cat.id}
                    category={cat}
                    isActive={activeCategory === cat.id}
                    variant="compact"
                    onClick={() =>
                      setActiveCategory((prev) =>
                        prev === cat.id ? null : cat.id
                      )
                    }
                  />
                ))}
              </>
            )}
          </div>
          <p className="mt-4 text-center text-xs text-ink-soft/80 lg:hidden">
            {t("viewCategories")} ↑
          </p>

          {loading ? (
            <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex flex-col overflow-hidden rounded-xl border border-[#1F443C]/10">
                  <div className="aspect-[5/4] animate-pulse bg-[#1F443C]/8" />
                  <div className="flex flex-col gap-3 p-4 sm:p-5">
                    <div className="h-5 w-3/4 animate-pulse rounded bg-[#1F443C]/8" />
                    <div className="h-4 w-full animate-pulse rounded bg-[#1F443C]/8" />
                    <div className="h-4 w-2/3 animate-pulse rounded bg-[#1F443C]/8" />
                    <div className="mt-2 flex items-end justify-between">
                      <div className="h-7 w-16 animate-pulse rounded bg-[#1F443C]/8" />
                      <div className="h-9 w-20 animate-pulse rounded-lg bg-[#1F443C]/8" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <p className="py-20 text-center text-ink-soft">
              {t("noProducts")}
            </p>
          ) : (
            <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filtered.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}
        </section>
      </main>

      <SiteFooter />
      <Chatbot />
    </>
  );
}
