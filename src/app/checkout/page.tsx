"use client";

import { useState, useEffect } from "react";
import { useCart } from "@/contexts/cart-context";
import { useLanguage } from "@/contexts/language-context";
import { useAuth } from "@/contexts/auth-context";
import { Header } from "@/components/header";
import { CartDrawer } from "@/components/cart-drawer";
import { CheckCircle, ArrowLeft, Loader2, ClipboardList } from "lucide-react";
import Link from "next/link";

export default function CheckoutPage() {
  const { items, totalPrice, clearCart, clearRemoteCart, cartReady } = useCart();
  const { t } = useLanguage();
  const { profile, refreshProfile } = useAuth();
  const [cartOpen, setCartOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);

  const profileComplete =
    Boolean(profile?.full_name?.trim()) && Boolean(profile?.phone?.trim());

  useEffect(() => {
    if (profile?.full_name) setName(profile.full_name);
    if (profile?.phone) setPhone(profile.phone);
  }, [profile?.full_name, profile?.phone]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!items.length || !cartReady) return;
    setSubmitting(true);

    const customerName = profileComplete
      ? (profile!.full_name ?? "").trim()
      : name.trim();
    const customerPhone = profileComplete
      ? (profile!.phone ?? "").trim()
      : phone.trim();

    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_name: customerName,
          customer_phone: customerPhone,
          items: items.map((i) => ({
            product_id: i.product.id,
            product_name: i.product.name,
            quantity: i.quantity,
            unit_price: i.product.price,
          })),
          total_price: totalPrice,
        }),
      });
      const data = await res.json();
      if (res.status === 401) {
        alert(t("orderRequiresSignIn"));
        window.location.href = `/sign-in?next=${encodeURIComponent("/checkout")}`;
        return;
      }
      if (res.status === 400 && data?.code === "PROFILE_INCOMPLETE") {
        alert(data?.error ?? t("profileIncompleteCheckout"));
        return;
      }
      if (res.status === 503 && data?.code === "SCHEMA_OUTDATED") {
        alert(data?.error ?? t("orderSchemaOutdated"));
        return;
      }
      if (!res.ok) {
        const parts = [data?.error, data?.details].filter(Boolean);
        alert(parts.length ? parts.join("\n\n") : t("orderFailed"));
        return;
      }
      await clearRemoteCart();
      clearCart();
      await refreshProfile();
      setOrderId(data.display_id ?? data.id ?? "confirmed");
    } catch {
      alert(t("orderFailed"));
    } finally {
      setSubmitting(false);
    }
  }

  if (orderId) {
    return (
      <>
        <Header onCartClick={() => setCartOpen(true)} />
        <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
        <main className="mx-auto flex max-w-lg flex-col items-center px-4 py-24 text-center">
          <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/15">
            <CheckCircle className="h-10 w-10 text-emerald-400" />
          </div>
          <h1 className="text-2xl font-bold text-[#F5E6C8]">
            {t("orderPlaced")}
          </h1>
          <p className="mt-2 text-[#F5E6C8]/60">
            {t("yourOrder")}{" "}
            <span className="font-semibold text-primary">{orderId}</span>{" "}
            {t("orderConfirmation")}
          </p>
          <Link
            href="/account/orders"
            className="mt-8 inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-bold text-[#0A2923] shadow-sm hover:bg-primary-dark transition-colors"
          >
            <ClipboardList className="h-4 w-4" />
            {t("myOrders")}
          </Link>
        </main>
      </>
    );
  }

  return (
    <>
      <Header onCartClick={() => setCartOpen(true)} />
      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />

      <main className="mx-auto max-w-lg px-4 py-10">
        <Link
          href="/"
          className="mb-6 inline-flex items-center gap-1 text-sm text-[#F5E6C8]/60 hover:text-primary transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("backToShop")}
        </Link>

        <h1 className="text-2xl font-bold text-[#F5E6C8]">{t("checkout")}</h1>

        {items.length === 0 ? (
          <p className="mt-8 text-center text-[#F5E6C8]/50">
            {t("cartEmptyCheckout")}{" "}
            <Link href="/" className="text-primary underline">
              {t("browseProducts")}
            </Link>
          </p>
        ) : (
          <>
            <div className="mt-6 rounded-xl border border-[#D3A94C]/20 bg-[#1F443C] p-4">
              <h2 className="mb-3 text-sm font-semibold text-[#F5E6C8]/70">
                {t("orderSummary")}
              </h2>
              <ul className="divide-y divide-[#D3A94C]/10">
                {items.map((item) => (
                  <li
                    key={item.product.id}
                    className="flex items-center justify-between py-2 text-sm"
                  >
                    <span className="text-[#F5E6C8]/70">
                      {item.product.name} &times; {item.quantity}
                    </span>
                    <span className="font-semibold text-[#F5E6C8]">
                      ₪{(item.product.price * item.quantity).toFixed(2)}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="mt-3 flex items-center justify-between border-t border-[#D3A94C]/20 pt-3">
                <span className="font-semibold text-[#F5E6C8]/70">{t("total")}</span>
                <span className="text-lg font-bold text-primary">
                  ₪{totalPrice.toFixed(2)}
                </span>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              {profileComplete ? (
                <div className="rounded-xl border border-[#D3A94C]/20 bg-[#1F443C] p-4 text-sm">
                  <p className="font-medium text-[#F5E6C8]">
                    {t("deliveryContact")}
                  </p>
                  <p className="mt-2 text-[#F5E6C8]/70">
                    {profile!.full_name}
                    <br />
                    {profile!.phone}
                  </p>
                  <Link
                    href="/account"
                    className="mt-3 inline-block text-primary font-medium hover:underline"
                  >
                    {t("editInAccount")}
                  </Link>
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-medium text-[#F5E6C8]/70">
                      {t("name")}
                    </label>
                    <input
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-[#D3A94C]/20 bg-[#163530] px-3 py-2 text-sm text-[#F5E6C8] outline-none placeholder:text-[#F5E6C8]/30 focus:border-primary focus:ring-2 focus:ring-primary/20"
                      placeholder={t("namePlaceholder")}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#F5E6C8]/70">
                      {t("phone")}
                    </label>
                    <input
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-[#D3A94C]/20 bg-[#163530] px-3 py-2 text-sm text-[#F5E6C8] outline-none placeholder:text-[#F5E6C8]/30 focus:border-primary focus:ring-2 focus:ring-primary/20"
                      placeholder={t("phonePlaceholder")}
                    />
                  </div>
                  <p className="text-xs text-[#F5E6C8]/40">{t("checkoutProfileHint")}</p>
                </>
              )}
              <button
                type="submit"
                disabled={submitting || !cartReady}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-bold text-[#0A2923] shadow-sm hover:bg-primary-dark transition-colors disabled:opacity-50"
              >
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                {submitting ? t("placingOrder") : t("placeOrder")}
              </button>
            </form>
          </>
        )}
      </main>
    </>
  );
}
