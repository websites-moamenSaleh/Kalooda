"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { CategoryCard } from "@/components/category-card";
import { ProductCard } from "@/components/product-card";
import { Header } from "@/components/header";
import { CartDrawer } from "@/components/cart-drawer";
import { Chatbot } from "@/components/chatbot";
import { SiteFooter } from "@/components/site-footer";
import { useLanguage } from "@/contexts/language-context";
import { useAuth } from "@/contexts/auth-context";
import { useCartDrawerEvent } from "@/hooks/use-cart-drawer-event";
import {
  selectTopBestSellerProducts,
  getProductsForMenuCategory,
  CHEF_SELECTIONS_COUNT,
} from "@/lib/storefront-home-helpers";
import type { Category, Product } from "@/types/database";
import {
  broadcastPayloadToPostgresShape,
  mergeProductChangeIntoList,
} from "@/lib/realtime-products";
import { subscribeStorefrontCatalog } from "@/lib/storefront-catalog-realtime";

export default function HomePage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [menuCategoryId, setMenuCategoryId] = useState<string | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const { t } = useLanguage();
  const { user } = useAuth();

  useCartDrawerEvent(setCartOpen);

  useEffect(() => {
    const unsub = subscribeStorefrontCatalog((event) => {
      setProducts((prev) => {
        const payload =
          event.type === "postgres"
            ? event.payload
            : broadcastPayloadToPostgresShape(event.data);
        if (!payload) return prev;
        return mergeProductChangeIntoList(prev, payload);
      });
    });

    let cancelled = false;
    Promise.all([
      fetch("/api/categories").then((r) => r.json()),
      fetch("/api/products").then((r) => r.json()),
    ])
      .then(([cats, prods]) => {
        if (cancelled) return;
        setCategories(cats);
        setProducts(prods);
      })
      .catch((err) => console.error("Failed to load data:", err))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
      unsub();
    };
  }, []);

  const available = useMemo(
    () => products.filter((p) => !p.unavailable_today),
    [products]
  );

  const chefSelections = useMemo(
    () => selectTopBestSellerProducts(available),
    [available]
  );

  const menuCategoryProducts = useMemo(
    () => getProductsForMenuCategory(products, menuCategoryId),
    [products, menuCategoryId]
  );

  function handleMenuCategorySelect(categoryId: string) {
    setMenuCategoryId((prev) =>
      prev === categoryId ? null : categoryId
    );
  }

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
          <div className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:py-14">
            <div className="mx-auto max-w-3xl text-center">
              <h1 className="mb-4 flex justify-center">
                <Image
                  src="/brand/logo-transparent.png"
                  alt="Kalooda"
                  width={3429}
                  height={1764}
                  className="h-auto w-full max-w-[260px] object-contain sm:max-w-[340px] lg:max-w-[400px]"
                  priority
                />
              </h1>
              <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-[#A8B5AD] sm:text-lg">
                {t("heroSubtitle")}
              </p>
              <div className="mt-6 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                <a href="#categories" className="btn-primary-solid px-8 py-3.5">
                  {t("browseMenu")}
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

        <section className="border-b border-[#1F443C]/8 bg-gradient-to-b from-[#fcfaf5] to-[#f0e9dd] py-16 sm:py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <div className="text-center">
              <h2 className="font-display text-3xl font-semibold text-ink sm:text-4xl">
                {t("sectionSelectionsTitle")}
              </h2>
            </div>
            <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
              {loading ? (
                [...Array(CHEF_SELECTIONS_COUNT)].map((_, i) => (
                  <div
                    key={i}
                    className="aspect-[5/4] animate-pulse rounded-xl bg-[#1F443C]/8"
                  />
                ))
              ) : chefSelections.length === 0 ? (
                <p className="col-span-full py-6 text-center text-ink-soft">
                  {t("noProducts")}
                </p>
              ) : (
                chefSelections.map((p, i) => (
                  <ProductCard key={p.id} product={p} priority={i === 0} />
                ))
              )}
            </div>
          </div>
        </section>

        <section
          id="categories"
          className="border-b border-[#1F443C]/8 bg-[#faf6ef] py-16 sm:py-20"
        >
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="font-display text-3xl font-semibold text-ink sm:text-4xl">
                {t("sectionMenuTitle")}
              </h2>
              <div className="divider-gold mx-auto mt-4 max-w-xs" />
            </div>
            <div className="mt-12 flex flex-wrap justify-center gap-4 sm:gap-5 md:gap-6">
              {loading ? (
                <>
                  {[...Array(4)].map((_, i) => (
                    <div
                      key={i}
                      className="h-[11.5rem] w-[9.25rem] shrink-0 animate-pulse rounded-2xl bg-[#1F443C]/8 sm:h-[12.75rem] sm:w-[10.75rem] md:h-[13.25rem] md:w-[11.75rem] lg:h-[14rem] lg:w-[12.5rem]"
                    />
                  ))}
                </>
              ) : (
                categories.map((cat) => (
                  <CategoryCard
                    key={cat.id}
                    category={cat}
                    size="large"
                    isActive={menuCategoryId === cat.id}
                    onClick={() => handleMenuCategorySelect(cat.id)}
                  />
                ))
              )}
            </div>

            <div className="mt-12">
              {menuCategoryId !== null && loading ? (
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {[...Array(4)].map((_, i) => (
                    <div
                      key={i}
                      className="flex flex-col overflow-hidden rounded-xl border border-[#1F443C]/10"
                    >
                      <div className="aspect-[5/4] animate-pulse bg-[#1F443C]/8" />
                      <div className="flex flex-col gap-3 p-4 sm:p-5">
                        <div className="h-5 w-3/4 animate-pulse rounded bg-[#1F443C]/8" />
                        <div className="h-4 w-full animate-pulse rounded bg-[#1F443C]/8" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : menuCategoryId === null ? (
                !loading ? (
                  <p className="py-10 text-center text-ink-soft">
                    {t("menuSelectCategory")}
                  </p>
                ) : null
              ) : menuCategoryProducts.length === 0 ? (
                <p className="py-10 text-center text-ink-soft">
                  {t("noProducts")}
                </p>
              ) : (
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {menuCategoryProducts.map((p) => (
                    <ProductCard key={p.id} product={p} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>

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
              <a href="#categories" className="btn-outline-light min-w-[200px]">
                {t("browseMenu")}
              </a>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
      {/* Chatbot disabled — feature not ready for production */}
      {/* <Chatbot /> */}
    </>
  );
}
