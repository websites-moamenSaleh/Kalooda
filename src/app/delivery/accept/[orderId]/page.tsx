"use client";

import { useState, useEffect, use } from "react";
import {
  Truck,
  CheckCircle,
  XCircle,
  Loader2,
  Package,
  Candy,
} from "lucide-react";
import Link from "next/link";
import { useLanguage } from "@/contexts/language-context";
import { LanguageSwitcher } from "@/components/language-switcher";

type DeliveryStatus = "loading" | "idle" | "accepting" | "accepted" | "error";

interface OrderData {
  id: string;
  display_id: string;
  customer_name: string;
  items: { product_name: string; quantity: number }[];
  total_price: number;
  status: string;
}

export default function DeliveryAcceptPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = use(params);
  const { t } = useLanguage();
  const [order, setOrder] = useState<OrderData | null>(null);
  const [status, setStatus] = useState<DeliveryStatus>("loading");
  const [driverName, setDriverName] = useState("");

  useEffect(() => {
    fetch(`/api/orders/${orderId}`)
      .then((r) => {
        if (!r.ok) throw new Error("Not found");
        return r.json();
      })
      .then((found: OrderData) => {
        setOrder(found);
        setStatus(found.status === "assigned" ? "accepted" : "idle");
      })
      .catch(() => setStatus("error"));
  }, [orderId]);

  async function handleAccept() {
    if (!driverName.trim()) return;
    setStatus("accepting");
    try {
      const res = await fetch(`/api/orders/${orderId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "assigned" }),
      });
      if (!res.ok) throw new Error();
      setStatus("accepted");
    } catch {
      setStatus("error");
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-amber-50 to-rose-50 px-4">
      <div className="mb-8 flex items-center gap-4">
        <Link href="/" className="flex items-center gap-2">
          <Candy className="h-7 w-7 text-primary" />
          <span className="text-xl font-bold text-stone-900">SweetDrop</span>
        </Link>
        <LanguageSwitcher />
      </div>

      <div className="w-full max-w-sm rounded-2xl border border-stone-200 bg-white p-6 shadow-lg">
        {status === "loading" && (
          <div className="flex flex-col items-center py-8 text-stone-400">
            <Loader2 className="h-8 w-8 animate-spin" />
            <p className="mt-3 text-sm">{t("loadingOrder")}</p>
          </div>
        )}

        {status === "error" && (
          <div className="flex flex-col items-center py-8 text-red-500">
            <XCircle className="h-10 w-10" />
            <p className="mt-3 text-sm font-medium">
              {t("orderNotFound")}
            </p>
          </div>
        )}

        {status === "accepted" && (
          <div className="flex flex-col items-center py-8">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
              <CheckCircle className="h-8 w-8 text-emerald-600" />
            </div>
            <h2 className="mt-4 text-lg font-bold text-stone-900">
              {t("deliveryAccepted")}
            </h2>
            <p className="mt-1 text-sm text-stone-500">
              {t("order")} {order?.display_id} {t("orderAssigned")}
            </p>
          </div>
        )}

        {(status === "idle" || status === "accepting") && order && (
          <>
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-100">
                <Truck className="h-6 w-6 text-amber-700" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-stone-900">
                  {t("newDelivery")}
                </h2>
                <p className="text-xs text-stone-500">
                  {t("order")} {order.display_id}
                </p>
              </div>
            </div>

            <div className="mb-5 rounded-xl border border-stone-100 bg-stone-50 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-stone-400 mb-2">
                {t("items")}
              </p>
              <ul className="space-y-1">
                {order.items.map((item, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm">
                    <Package className="h-3.5 w-3.5 text-stone-400" />
                    <span className="text-stone-700">
                      {item.product_name} &times; {item.quantity}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-sm font-semibold text-stone-800">
                {t("total")}: ${order.total_price.toFixed(2)}
              </p>
              <p className="text-xs text-stone-500 mt-1">
                {t("customerLabel")} {order.customer_name}
              </p>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-stone-700 mb-1">
                {t("yourName")}
              </label>
              <input
                value={driverName}
                onChange={(e) => setDriverName(e.target.value)}
                placeholder={t("enterYourName")}
                className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <button
              onClick={handleAccept}
              disabled={status === "accepting" || !driverName.trim()}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 text-sm font-bold text-white shadow-sm hover:bg-emerald-700 transition-colors disabled:opacity-50"
            >
              {status === "accepting" ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> {t("accepting")}
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4" /> {t("acceptDelivery")}
                </>
              )}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
