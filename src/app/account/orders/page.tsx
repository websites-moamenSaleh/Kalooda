"use client";

import { useState, useEffect, useCallback } from "react";
import { useLanguage } from "@/contexts/language-context";
import { Header } from "@/components/header";
import { CartDrawer } from "@/components/cart-drawer";
import { AccountSubnav } from "@/components/account-subnav";
import type { Order } from "@/types/database";
import type { TranslationKey } from "@/lib/translations";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";

const STATUS_KEY: Record<Order["status"], TranslationKey> = {
  pending: "pending",
  assigned: "assigned",
  out_for_delivery: "outForDelivery",
  delivered: "delivered",
};

export default function AccountOrdersPage() {
  const { t } = useLanguage();
  const [cartOpen, setCartOpen] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/orders/mine", { credentials: "same-origin" });
      if (res.ok) {
        const data = (await res.json()) as Order[];
        setOrders(Array.isArray(data) ? data : []);
      } else {
        setOrders([]);
      }
    } catch {
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchOrders();
  }, [fetchOrders]);

  return (
    <>
      <Header onCartClick={() => setCartOpen(true)} />
      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />

      <main className="mx-auto max-w-lg px-4 py-10">
        <Link
          href="/"
          className="mb-6 inline-flex items-center gap-1 text-sm text-stone-500 hover:text-primary transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("backToShop")}
        </Link>

        <h1 className="text-2xl font-bold text-stone-900">
          {t("orderHistoryTitle")}
        </h1>

        <div className="mt-6">
          <AccountSubnav />
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : orders.length === 0 ? (
          <p className="mt-4 text-center text-stone-500">
            {t("orderHistoryEmpty")}
          </p>
        ) : (
          <ul className="mt-4 space-y-3">
            {orders.map((o) => (
              <li
                key={o.id}
                className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-stone-900">
                      {o.display_id}
                    </p>
                    <p className="text-xs text-stone-500">
                      {new Date(o.created_at).toLocaleString()}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-stone-100 px-2 py-0.5 text-xs font-medium text-stone-700">
                    {t(STATUS_KEY[o.status])}
                  </span>
                </div>
                <p className="mt-2 text-sm font-medium text-primary">
                  ₪{Number(o.total_price).toFixed(2)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </main>
    </>
  );
}
