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
      const res = await fetch(`/api/orders/${orderId}/status?token=${encodeURIComponent(token)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "preparing" }),
      });
      if (!res.ok) throw new Error();
      setStatus("accepted");
    } catch {
      setStatus("error");
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="mb-8 flex items-center gap-4">
        <Link href="/">
          <Image
            src="/brand/logo-transparent.png"
            alt="Kalooda"
            width={140}
            height={72}
            className="h-10 w-auto object-contain"
          />
        </Link>
        <LanguageSwitcher />
      </div>

      <div className="w-full max-w-sm rounded-2xl border border-[#D3A94C]/20 bg-[#1F443C] p-6 shadow-2xl shadow-black/40">
        {status === "loading" && (
          <div className="flex flex-col items-center py-8 text-[#F5E6C8]/40">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="mt-3 text-sm">{t("loadingOrder")}</p>
          </div>
        )}

        {status === "error" && (
          <div className="flex flex-col items-center py-8 text-red-400">
            <XCircle className="h-10 w-10" />
            <p className="mt-3 text-sm font-medium">
              {t("orderNotFound")}
            </p>
          </div>
        )}

        {status === "accepted" && (
          <div className="flex flex-col items-center py-8">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/15">
              <CheckCircle className="h-8 w-8 text-emerald-400" />
            </div>
            <h2 className="mt-4 text-lg font-bold text-[#F5E6C8]">
              {t("deliveryAccepted")}
            </h2>
            <p className="mt-1 text-sm text-[#F5E6C8]/60">
              {t("order")} {order?.display_id} {t("orderAssigned")}
            </p>
          </div>
        )}

        {(status === "idle" || status === "accepting") && order && (
          <>
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#D3A94C]/10">
                <Truck className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-[#F5E6C8]">
                  {t("newDelivery")}
                </h2>
                <p className="text-xs text-[#F5E6C8]/50">
                  {t("order")} {order.display_id}
                </p>
              </div>
            </div>

            <div className="mb-5 rounded-xl border border-[#D3A94C]/10 bg-[#163530] p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#F5E6C8]/40 mb-2">
                {t("items")}
              </p>
              <ul className="space-y-1">
                {order.items.map((item, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm">
                    <Package className="h-3.5 w-3.5 text-[#F5E6C8]/40" />
                    <span className="text-[#F5E6C8]/70">
                      {item.product_name} &times; {item.quantity}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-sm font-semibold text-primary">
                {t("total")}: ₪{order.total_price.toFixed(2)}
              </p>
              <p className="text-xs text-[#F5E6C8]/50 mt-1">
                {t("customerLabel")} {order.customer_name}
              </p>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-[#F5E6C8]/70 mb-1">
                {t("yourName")}
              </label>
              <input
                value={driverName}
                onChange={(e) => setDriverName(e.target.value)}
                placeholder={t("enterYourName")}
                className="w-full rounded-lg border border-[#D3A94C]/20 bg-[#163530] px-3 py-2 text-sm text-[#F5E6C8] outline-none placeholder:text-[#F5E6C8]/30 focus:border-primary focus:ring-2 focus:ring-primary/20"
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
