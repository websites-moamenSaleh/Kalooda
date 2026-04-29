"use client";

import { useState, useEffect, use } from "react";
import { useSearchParams } from "next/navigation";
import {
  Truck,
  CheckCircle,
  XCircle,
  Loader2,
  Package,
  Phone,
  MapPin,
  CreditCard,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useLanguage } from "@/contexts/language-context";
import { LanguageSwitcher } from "@/components/language-switcher";

type DeliveryStatus = "loading" | "ready" | "updating" | "expired" | "error";

interface OrderData {
  id: string;
  display_id: string;
  customer_name: string;
  customer_phone: string | null;
  items: { product_name: string; quantity: number }[];
  total_price: number;
  status: string;
  payment_method?: "cash_on_delivery" | "credit_card" | string | null;
  delivery_address?: string | null;
  delivery_formatted_address?: string | null;
  delivery_latitude?: number | null;
  delivery_longitude?: number | null;
}

function orderMapHref(order: OrderData): string | null {
  const lat = Number(order.delivery_latitude);
  const lng = Number(order.delivery_longitude);
  const hasValidCoords =
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    Math.abs(lat) <= 90 &&
    Math.abs(lng) <= 180 &&
    !(Math.abs(lat) < 0.000001 && Math.abs(lng) < 0.000001);

  if (hasValidCoords) {
    return `https://www.google.com/maps?q=${lat},${lng}`;
  }
  const query = (order.delivery_formatted_address ?? order.delivery_address ?? "").trim();
  if (!query) return null;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
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

  useEffect(() => {
    fetch(`/api/orders/${orderId}?token=${encodeURIComponent(token)}`)
      .then((r) => {
        if (r.status === 410) throw new Error("expired");
        if (!r.ok) throw new Error("not-found");
        return r.json();
      })
      .then((found: OrderData) => {
        setOrder(found);
        setStatus("ready");
      })
      .catch((err: Error) => {
        setStatus(err.message === "expired" ? "expired" : "error");
      });
  }, [orderId, token]);

  async function updateDriverStatus(nextStatus: "out_for_delivery" | "completed") {
    if (!order || status === "updating") return;
    setStatus("updating");
    try {
      const res = await fetch(
        `/api/orders/${orderId}/status?token=${encodeURIComponent(token)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: nextStatus }),
        }
      );
      if (res.status === 410) {
        setStatus("expired");
        return;
      }
      if (!res.ok) throw new Error();
      const updated = (await res.json()) as OrderData;
      setOrder(updated);
      setStatus("ready");
    } catch {
      setStatus("error");
    }
  }

  function paymentMethodLabel(paymentMethod: OrderData["payment_method"]) {
    if ((paymentMethod ?? "cash_on_delivery") === "cash_on_delivery") {
      return t("cashOnDelivery");
    }
    if (paymentMethod === "credit_card") return t("creditCard");
    return paymentMethod ?? t("cashOnDelivery");
  }

  function renderOrderDetails() {
    if (!order) return null;
    const mapHref = orderMapHref(order);

    return (
      <div className="mb-6 rounded-xl border border-[#D3A94C]/14 bg-[#143C34]/70 p-4">
        <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.2em] text-[#D3A94C]/55">
          {t("orderDetails")}
        </p>
        <div className="space-y-2 text-sm text-[#E5EDE8]/85">
          <p>
            <span className="font-semibold text-[#FFEC94]">{t("order")}:</span>{" "}
            {order.display_id}
          </p>
          <p>
            <span className="font-semibold text-[#FFEC94]">{t("customer")}:</span>{" "}
            {order.customer_name}
          </p>
          <p className="flex items-center gap-2">
            <Phone className="h-3.5 w-3.5 shrink-0 text-[#D3A94C]/55" />
            {order.customer_phone ? (
              <a href={`tel:${order.customer_phone}`} className="hover:underline">
                {order.customer_phone}
              </a>
            ) : (
              "—"
            )}
          </p>
          <p className="flex items-center gap-2">
            <CreditCard className="h-3.5 w-3.5 shrink-0 text-[#D3A94C]/55" />
            {paymentMethodLabel(order.payment_method)}
          </p>
          <div className="flex items-start gap-2">
            <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#D3A94C]/55" />
            <div>
              <p>{order.delivery_address ?? order.delivery_formatted_address ?? "—"}</p>
              {mapHref ? (
                <a
                  href={mapHref}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1 inline-flex text-xs font-semibold text-[#FFEC94] hover:underline"
                >
                  {t("openInMap")}
                </a>
              ) : null}
            </div>
          </div>
        </div>

        <p className="mb-2 mt-5 text-[10px] font-bold uppercase tracking-[0.2em] text-[#D3A94C]/55">
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
      </div>
    );
  }

  function renderDriverAction() {
    if (!order) return null;

    if (order.status === "preparing") {
      return (
        <button
          type="button"
          onClick={() => void updateDriverStatus("out_for_delivery")}
          disabled={status === "updating"}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-emerald-300 to-emerald-400 py-3.5 text-sm font-bold text-[#073126] shadow-lg transition-all hover:brightness-105 disabled:opacity-45"
        >
          {status === "updating" ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> {t("updatingOrder")}
            </>
          ) : (
            <>
              <Truck className="h-4 w-4" /> {t("orderPickedUp")}
            </>
          )}
        </button>
      );
    }

    if (order.status === "out_for_delivery") {
      return (
        <button
          type="button"
          onClick={() => void updateDriverStatus("completed")}
          disabled={status === "updating"}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-emerald-300 to-emerald-400 py-3.5 text-sm font-bold text-[#073126] shadow-lg transition-all hover:brightness-105 disabled:opacity-45"
        >
          {status === "updating" ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> {t("updatingOrder")}
            </>
          ) : (
            <>
              <CheckCircle className="h-4 w-4" /> {t("delivered")}
            </>
          )}
        </button>
      );
    }

    if (order.status === "completed") {
      return (
        <p className="rounded-xl border border-emerald-400/20 bg-emerald-300/10 px-4 py-3 text-center text-sm font-semibold text-emerald-100">
          {t("deliveryComplete")}
        </p>
      );
    }

    return (
      <p className="rounded-xl border border-[#D3A94C]/15 bg-[#D3A94C]/10 px-4 py-3 text-center text-sm font-medium text-[#E5EDE8]/80">
        {t("driverOrderNotReady")}
      </p>
    );
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
            className="brand-logo-outline h-10 w-auto object-contain"
          />
        </Link>
        <LanguageSwitcher className="flex items-center gap-1.5 rounded-lg border border-[#1F443C]/12 bg-white/90 px-3 py-2 text-sm font-medium text-ink-soft hover:border-[#D3A94C]/35" />
      </div>

      <div className="w-full max-w-md rounded-2xl border border-[#D3A94C]/20 bg-gradient-to-b from-[#1B4D43] to-[#123A33] p-6 shadow-2xl sm:p-8">
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

        {status === "expired" && (
          <div className="flex flex-col items-center py-12 text-center">
            <XCircle className="h-12 w-12 text-amber-300" />
            <p className="mt-4 text-sm font-semibold text-amber-100">
              {t("driverLinkExpired")}
            </p>
          </div>
        )}

        {(status === "ready" || status === "updating") && order && (
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

            {renderOrderDetails()}
            {renderDriverAction()}
          </>
        )}
      </div>
    </div>
  );
}
