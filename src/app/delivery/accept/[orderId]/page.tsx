"use client";

import { useState, useEffect, use } from "react";
import { useSearchParams } from "next/navigation";
import {
  Truck,
  CheckCircle,
  XCircle,
  Loader2,
  Package,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
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
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const { t } = useLanguage();
  const [order, setOrder] = useState<OrderData | null>(null);
  const [status, setStatus] = useState<DeliveryStatus>("loading");
  const [driverName, setDriverName] = useState("");

  useEffect(() => {
    fetch(`/api/orders/${orderId}?token=${encodeURIComponent(token)}`)
      .then((r) => {
        if (!r.ok) throw new Error("Not found");
        return r.json();
      })
      .then((found: OrderData) => {
        setOrder(found);
        if (found.status === "preparing") setStatus("accepted");
        else if (found.status === "pending") setStatus("idle");
        else setStatus("error");
      })
      .catch(() => setStatus("error"));
  }, [orderId, token]);

  async function handleAccept() {
    if (!driverName.trim()) return;
    setStatus("accepting");
    try {
      const res = await fetch(
        `/api/orders/${orderId}/status?token=${encodeURIComponent(token)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "preparing" }),
        }
      );
      if (!res.ok) throw new Error();
      setStatus("accepted");
    } catch {
      setStatus("error");
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-[#F4EDE3] to-[#E8DFD2] px-4 py-10">
      <div className="mb-10 flex items-center gap-4">
        <Link href="/">
          <Image
            src="/brand/logo-transparent.png"
            alt="Kalooda"
            width={160}
            height={82}
            className="h-10 w-auto object-contain"
          />
        </Link>
        <LanguageSwitcher className="flex items-center gap-1.5 rounded-lg border border-[#1F443C]/12 bg-white/90 px-3 py-2 text-sm font-medium text-ink-soft hover:border-[#D3A94C]/35" />
      </div>

      <div className="w-full max-w-md rounded-2xl border border-[#D3A94C]/20 bg-gradient-to-b from-[#0A2923] to-[#082018] p-6 shadow-2xl sm:p-8">
        {status === "loading" && (
          <div className="flex flex-col items-center py-12 text-[#A8B5AD]/65">
            <Loader2 className="h-9 w-9 animate-spin text-[#FFEC94]" />
            <p className="mt-4 text-sm font-medium">{t("loadingOrder")}</p>
          </div>
        )}

        {status === "error" && (
          <div className="flex flex-col items-center py-12 text-center">
            <XCircle className="h-12 w-12 text-red-400" />
            <p className="mt-4 text-sm font-semibold text-red-200">
              {t("orderNotFound")}
            </p>
          </div>
        )}

        {status === "accepted" && (
          <div className="flex flex-col items-center py-10 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full border border-emerald-500/30 bg-emerald-500/10">
              <CheckCircle className="h-10 w-10 text-emerald-400" />
            </div>
            <h2 className="mt-6 font-display text-xl font-semibold text-[#F0F5F3]">
              {t("deliveryAccepted")}
            </h2>
            <p className="mt-2 text-sm text-[#A8B5AD]/80">
              {t("order")} {order?.display_id} {t("orderAssigned")}
            </p>
          </div>
        )}

        {(status === "idle" || status === "accepting") && order && (
          <>
            <div className="mb-6 flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-[#D3A94C]/25 bg-[#D3A94C]/10">
                <Truck className="h-6 w-6 text-[#FFEC94]" />
              </div>
              <div>
                <h2 className="font-display text-lg font-semibold text-[#F0F5F3]">
                  {t("newDelivery")}
                </h2>
                <p className="text-xs text-[#A8B5AD]/65">
                  {t("order")} {order.display_id}
                </p>
              </div>
            </div>

            <div className="mb-6 rounded-xl border border-[#D3A94C]/12 bg-[#082018]/60 p-4">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-[#D3A94C]/55">
                {t("items")}
              </p>
              <ul className="space-y-2">
                {order.items.map((item, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-[#E5EDE8]/85">
                    <Package className="h-3.5 w-3.5 shrink-0 text-[#D3A94C]/45" />
                    <span>
                      {item.product_name} × {item.quantity}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-3 font-display text-lg font-bold text-[#FFEC94]">
                {t("total")}: ₪{order.total_price.toFixed(2)}
              </p>
              <p className="mt-2 text-xs text-[#A8B5AD]/60">
                {t("customerLabel")} {order.customer_name}
              </p>
            </div>

            <div className="mb-5">
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[#A8B5AD]/75">
                {t("yourName")}
              </label>
              <input
                value={driverName}
                onChange={(e) => setDriverName(e.target.value)}
                placeholder={t("enterYourName")}
                className="input-premium-dark w-full"
              />
            </div>

            <button
              type="button"
              onClick={handleAccept}
              disabled={status === "accepting" || !driverName.trim()}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-emerald-600 to-emerald-700 py-3.5 text-sm font-bold text-white shadow-lg transition-all hover:brightness-105 disabled:opacity-45"
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
