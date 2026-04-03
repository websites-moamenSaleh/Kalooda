"use client";

import { useState, useEffect, useCallback } from "react";
import { useLanguage } from "@/contexts/language-context";
import { Header } from "@/components/header";
import { CartDrawer } from "@/components/cart-drawer";
import { AccountSubnav } from "@/components/account-subnav";
import { OrderDetailModal } from "@/components/order-detail-modal";
import type { Order } from "@/types/database";
import type { TranslationKey } from "@/lib/translations";
import { ArrowLeft, Loader2, ClipboardList } from "lucide-react";
import Link from "next/link";
import { useCartDrawerEvent } from "@/hooks/use-cart-drawer-event";

const STATUS_KEY: Record<Order["status"], TranslationKey> = {
  pending: "pending",
  preparing: "preparing",
  out_for_delivery: "outForDelivery",
};

export default function AccountOrdersPage() {
  const { t } = useLanguage();
  const [cartOpen, setCartOpen] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  useCartDrawerEvent(setCartOpen);

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
      <OrderDetailModal
        orderId={selectedOrderId}
        onClose={() => setSelectedOrderId(null)}
      />

      <main className="mx-auto max-w-lg px-4 py-10 sm:py-14">
        <Link
          href="/"
          className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-ink-soft transition-colors hover:text-primary-dark"
        >
          <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
          {t("backToShop")}
        </Link>

        <h1 className="font-display text-3xl font-semibold text-ink">
          {t("orderHistoryTitle")}
        </h1>

        <div className="mt-8">
          <AccountSubnav />
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-9 w-9 animate-spin text-primary" />
          </div>
        ) : orders.length === 0 ? (
          <div className="surface-panel mt-8 rounded-xl border border-dashed border-[#1F443C]/15 p-12 text-center">
            <ClipboardList className="mx-auto h-10 w-10 text-[#D3A94C]/40" />
            <p className="mt-4 text-ink-soft">{t("orderHistoryEmpty")}</p>
          </div>
        ) : (
          <ul className="mt-8 space-y-4">
            {orders.map((o) => (
              <li
                key={o.id}
                onClick={() => setSelectedOrderId(o.id)}
                className="surface-panel rounded-xl border border-[#1F443C]/10 p-5 transition-shadow hover:shadow-[var(--shadow-card)] cursor-pointer hover:border-[#1F443C]/25"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-display text-lg font-semibold text-ink">
                      {o.display_id}
                    </p>
                    <p className="mt-1 text-xs text-ink-soft">
                      {new Date(o.created_at).toLocaleString()}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full border border-[#D3A94C]/30 bg-[#FFF8E6] px-3 py-1 text-xs font-bold uppercase tracking-wide text-[#946E2A]">
                    {t(STATUS_KEY[o.status])}
                  </span>
                </div>
                <p className="mt-4 font-display text-xl font-bold text-primary-dark">
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
