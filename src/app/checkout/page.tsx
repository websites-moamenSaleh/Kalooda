"use client";

import { useState, useEffect, useRef } from "react";
import { useCart } from "@/contexts/cart-context";
import { useLanguage } from "@/contexts/language-context";
import { useAuth } from "@/contexts/auth-context";
import { Header } from "@/components/header";
import { CartDrawer } from "@/components/cart-drawer";
import Image from "next/image";
import { CheckCircle, ArrowLeft, Loader2, ClipboardList, MapPin } from "lucide-react";
import Link from "next/link";
import { useCartDrawerEvent } from "@/hooks/use-cart-drawer-event";
import { InlineBanner } from "@/components/inline-banner";
import { ORDER_VALIDATION_ERROR } from "@/lib/order-validation-constants";
import { lineUnitPrice } from "@/lib/cart-line-price";
import type { CustomerAddress } from "@/types/database";
import { AddressEditor, type AddressDraft } from "@/components/address-editor";
import dynamic from "next/dynamic";

type CheckoutBanner =
  | null
  | { type: "error"; message: string }
  | { type: "signIn" };
type SubmissionPhase = "idle" | "submitting";
const LazyMapPicker = dynamic(
  () => import("@/components/location-map-picker").then((m) => m.LocationMapPicker),
  { ssr: false }
);

function addressMapHref(addr: CustomerAddress): string {
  if (addr.latitude != null && addr.longitude != null) {
    return `https://www.google.com/maps?q=${addr.latitude},${addr.longitude}`;
  }
  const query = `${addr.city}, ${addr.street_line}, ${addr.building_number}`;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

export default function CheckoutPage() {
  const { items, totalPrice, clearCart, clearRemoteCart, cartReady } = useCart();
  const { t, locale } = useLanguage();
  const { profile, refreshProfile } = useAuth();
  const [cartOpen, setCartOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [fulfillmentType, setFulfillmentType] = useState<"delivery" | "pickup">(
    "delivery"
  );
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [deliveryLat, setDeliveryLat] = useState<number | null>(null);
  const [deliveryLng, setDeliveryLng] = useState<number | null>(null);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [addressMenuOpen, setAddressMenuOpen] = useState(false);
  const [addresses, setAddresses] = useState<CustomerAddress[]>([]);
  const [addressDraftOpen, setAddressDraftOpen] = useState(false);
  const [addressDraft, setAddressDraft] = useState<AddressDraft>({
    label_type: null,
    custom_label: "",
    city: "",
    street_line: "",
    building_number: "",
    latitude: null,
    longitude: null,
    is_default: false,
  });
  const [pickup, setPickup] = useState<{
    pickup_name: string | null;
    pickup_address: string | null;
    pickup_latitude: number | null;
    pickup_longitude: number | null;
  } | null>(null);
  const [saveAddressToProfile, setSaveAddressToProfile] = useState(false);
  const [submissionPhase, setSubmissionPhase] = useState<SubmissionPhase>("idle");
  const [orderId, setOrderId] = useState<string | null>(null);
  const [checkoutBanner, setCheckoutBanner] = useState<CheckoutBanner>(null);
  const checkoutNameInputRef = useRef<HTMLInputElement>(null);
  const checkoutPhoneInputRef = useRef<HTMLInputElement>(null);

  useCartDrawerEvent(setCartOpen);

  const profileComplete =
    Boolean(profile?.full_name?.trim()) && Boolean(profile?.phone?.trim());
  const selectedAddress =
    (selectedAddressId
      ? addresses.find((addr) => addr.id === selectedAddressId)
      : null) ?? null;

  function applySelectedAddress(id: string | null) {
    setSelectedAddressId(id);
    const selected = addresses.find((addr) => addr.id === id);
    if (!selected) return;
    setDeliveryAddress(
      `${selected.city}, ${selected.street_line}, ${selected.building_number}`
    );
    setDeliveryLat(selected.latitude != null ? Number(selected.latitude) : null);
    setDeliveryLng(selected.longitude != null ? Number(selected.longitude) : null);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrate checkout fields when profile loads
    if (profile?.full_name) setName(profile.full_name);
    if (profile?.phone) setPhone(profile.phone);
  }, [profile?.full_name, profile?.phone]);

  useEffect(() => {
    const saved = profile?.delivery_address?.trim();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- use saved profile address as fallback
    if (saved) setDeliveryAddress(saved);
  }, [profile?.delivery_address]);

  useEffect(() => {
    let active = true;
    void (async () => {
      const [addressRes, pickupRes] = await Promise.all([
        fetch("/api/addresses"),
        fetch("/api/business-settings"),
      ]);
      const addressJson = await addressRes.json();
      const pickupJson = await pickupRes.json();
      if (!active) return;
      const list = (addressJson?.data ?? []) as CustomerAddress[];
      setAddresses(list);
      const defaultAddr = list.find((item) => item.is_default) ?? list[0];
      if (defaultAddr) {
        setSelectedAddressId(defaultAddr.id);
        setDeliveryAddress(
          `${defaultAddr.city}, ${defaultAddr.street_line}, ${defaultAddr.building_number}`
        );
        setDeliveryLat(defaultAddr.latitude != null ? Number(defaultAddr.latitude) : null);
        setDeliveryLng(defaultAddr.longitude != null ? Number(defaultAddr.longitude) : null);
      }
      if (pickupRes.ok) setPickup(pickupJson.data ?? null);
    })();
    return () => {
      active = false;
    };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!items.length || !cartReady || submissionPhase !== "idle") return;
    setCheckoutBanner(null);

    if (!profileComplete) {
      const trimmedName = name.trim();
      const trimmedPhone = phone.trim();
      if (!trimmedName || !trimmedPhone) {
        setCheckoutBanner({
          type: "error",
          message: t("profileIncompleteCheckout"),
        });
        requestAnimationFrame(() => {
          if (!trimmedName) checkoutNameInputRef.current?.focus();
          else checkoutPhoneInputRef.current?.focus();
        });
        return;
      }
    }

    if (fulfillmentType === "delivery" && !deliveryAddress.trim()) {
      setCheckoutBanner({
        type: "error",
        message: t("addressRequiredCheckout"),
      });
      return;
    }
    setSubmissionPhase("submitting");

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
          fulfillment_type: fulfillmentType,
          delivery_address:
            fulfillmentType === "delivery" ? deliveryAddress.trim() : null,
          customer_address_id:
            fulfillmentType === "delivery" ? selectedAddressId : null,
          delivery_latitude: fulfillmentType === "delivery" ? deliveryLat : null,
          delivery_longitude: fulfillmentType === "delivery" ? deliveryLng : null,
          delivery_formatted_address:
            fulfillmentType === "delivery" ? deliveryAddress.trim() : null,
          payment_method: "cash_on_delivery",
          save_address_to_profile:
            fulfillmentType === "delivery" && saveAddressToProfile,
          items: items.map((i) => ({
            product_id: i.product.id,
            product_name: i.product.name,
            product_name_ar: i.product.name_ar ?? null,
            quantity: i.quantity,
            unit_price: lineUnitPrice(i),
            image_url: i.product.image_url?.trim() || null,
            line_options: i.line_options ?? null,
          })),
          total_price: totalPrice,
        }),
      });
      const data = await res.json();
      if (res.status === 401) {
        setCheckoutBanner({ type: "signIn" });
        setSubmissionPhase("idle");
        return;
      }
      if (res.status === 400 && data?.code === "PROFILE_INCOMPLETE") {
        setCheckoutBanner({ type: "error", message: t("profileIncompleteCheckout") });
        setSubmissionPhase("idle");
        return;
      }
      if (res.status === 403 && data?.code === "PHONE_NOT_VERIFIED") {
        setCheckoutBanner({ type: "error", message: t("orderBlockedUnverifiedPhone") });
        setSubmissionPhase("idle");
        return;
      }
      if (res.status === 400 && data?.code === ORDER_VALIDATION_ERROR) {
        setCheckoutBanner({ type: "error", message: t("orderInvalidRequest") });
        setSubmissionPhase("idle");
        return;
      }
      if (res.status === 503 && data?.code === "SCHEMA_OUTDATED") {
        setCheckoutBanner({ type: "error", message: t("orderSchemaOutdated") });
        setSubmissionPhase("idle");
        return;
      }
      if (!res.ok) {
        setCheckoutBanner({ type: "error", message: t("orderFailed") });
        setSubmissionPhase("idle");
        return;
      }
      setOrderId(data.display_id ?? data.id ?? "confirmed");
      void (async () => {
        try {
          await clearRemoteCart();
          clearCart();
          await refreshProfile();
        } catch {
          // Checkout is already confirmed; keep navigation bridge active.
        }
      })();
    } catch {
      setCheckoutBanner({ type: "error", message: t("orderFailed") });
      setSubmissionPhase("idle");
    }
  }

  if (orderId) {
    return (
      <>
        <Header onCartClick={() => setCartOpen(true)} />
        <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
        <main className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center px-4 py-20 text-center sm:py-28">
          <div className="surface-panel rounded-2xl border border-[#D3A94C]/20 px-8 py-12 shadow-[var(--shadow-elevated)]">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full border border-emerald-500/25 bg-emerald-500/10">
              <CheckCircle className="h-10 w-10 text-emerald-600" />
            </div>
            <h1 className="font-display text-2xl font-semibold text-ink sm:text-3xl">
              {t("orderPlaced")}
            </h1>
            <p className="mt-3 text-ink-soft">
              {t("yourOrder")}{" "}
              <span className="font-semibold text-primary-dark">{orderId}</span>{" "}
              {t("orderConfirmation")}
            </p>
            <Link
              href="/account/orders"
              className="btn-primary-solid mt-10 inline-flex items-center gap-2 px-8"
            >
              <ClipboardList className="h-4 w-4" />
              {t("myOrders")}
            </Link>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <Header onCartClick={() => setCartOpen(true)} />
      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />

      <main className="mx-auto max-w-lg px-4 py-10 sm:py-14">
        <Link
          href="/"
          className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-ink-soft transition-colors hover:text-primary-dark"
        >
          <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
          {t("backToShop")}
        </Link>

        <h1 className="font-display text-3xl font-semibold text-ink">
          {t("checkout")}
        </h1>

        {!cartReady ? (
          <div className="surface-panel mt-8 rounded-xl border border-[#1F443C]/10 p-5 sm:p-6">
            <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-ink-soft">
              {t("orderSummary")}
            </h2>
            <ul className="mt-4 divide-y divide-[#1F443C]/8">
              {Array.from({ length: 3 }).map((_, index) => (
                <li
                  key={`checkout-skeleton-${index}`}
                  className="flex items-center justify-between gap-4 py-3 first:pt-0"
                >
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <div className="h-10 w-10 shrink-0 animate-pulse rounded-lg bg-[#1F443C]/10" />
                    <div className="w-full max-w-[12rem] animate-pulse">
                      <div className="h-3.5 w-3/4 rounded bg-[#1F443C]/10" />
                    </div>
                  </div>
                  <div className="h-4 w-16 shrink-0 animate-pulse rounded bg-[#1F443C]/10" />
                </li>
              ))}
            </ul>
            <div className="mt-4 flex items-center justify-between border-t border-[#1F443C]/12 pt-4">
              <span className="font-semibold text-ink">{t("total")}</span>
              <div className="h-8 w-28 animate-pulse rounded bg-[#1F443C]/10" />
            </div>
          </div>
        ) : items.length === 0 ? (
          <div className="surface-panel mt-10 rounded-xl border border-dashed border-[#1F443C]/15 p-10 text-center">
            <p className="text-ink-soft">{t("cartEmptyCheckout")}</p>
            <Link
              href="/"
              className="btn-primary-solid mt-6 inline-block px-8 py-3"
            >
              {t("browseProducts")}
            </Link>
          </div>
        ) : (
          <>
            <div className="surface-panel mt-8 rounded-xl border border-[#1F443C]/10 p-5 sm:p-6">
              <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-ink-soft">
                {t("orderSummary")}
              </h2>
              <ul className="mt-4 divide-y divide-[#1F443C]/8">
                {items.map((item) => (
                  <li
                    key={item.product.id}
                    className="flex items-center justify-between gap-4 py-3 text-sm first:pt-0"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {item.product.image_url ? (
                        <Image
                          src={item.product.image_url}
                          alt={item.product.name}
                          width={40}
                          height={40}
                          sizes="40px"
                          className="rounded-lg object-cover shrink-0"
                        />
                      ) : (
                        <div className="h-10 w-10 rounded-lg bg-[#1F443C]/8 shrink-0" />
                      )}
                      <span className="text-ink-soft">
                        {locale === "ar" && item.product.name_ar ? item.product.name_ar : item.product.name} × {item.quantity}
                      </span>
                    </div>
                    <span className="font-semibold text-ink shrink-0">
                      ₪{(lineUnitPrice(item) * item.quantity).toFixed(2)}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="mt-4 flex items-center justify-between border-t border-[#1F443C]/12 pt-4">
                <span className="font-semibold text-ink">{t("total")}</span>
                <span className="font-display text-2xl font-bold text-primary-dark">
                  ₪{totalPrice.toFixed(2)}
                </span>
              </div>
            </div>

            <form
              noValidate
              onSubmit={handleSubmit}
              className="mt-8 space-y-5"
            >
              {checkoutBanner?.type === "signIn" ? (
                <InlineBanner variant="error" className="text-start">
                  <p>{t("orderRequiresSignIn")}</p>
                  <Link
                    href={`/sign-in?next=${encodeURIComponent("/checkout")}`}
                    className="inline-block font-semibold underline underline-offset-2 hover:opacity-90"
                  >
                    {t("signIn")}
                  </Link>
                </InlineBanner>
              ) : checkoutBanner?.type === "error" ? (
                <InlineBanner variant="error" className="text-start">
                  <p>{checkoutBanner.message}</p>
                </InlineBanner>
              ) : null}

              <fieldset className="space-y-3">
                <legend className="mb-1.5 block w-full text-xs font-semibold uppercase tracking-wide text-ink-soft">
                  {t("fulfillmentSection")}
                </legend>
                <div
                  className="flex gap-2"
                  role="radiogroup"
                  aria-label={t("fulfillmentSection")}
                >
                  <button
                    type="button"
                    role="radio"
                    aria-checked={fulfillmentType === "delivery"}
                    onClick={() => {
                      setCheckoutBanner(null);
                      setFulfillmentType("delivery");
                    }}
                    className={`flex-1 rounded-xl border px-4 py-3 text-sm font-semibold transition-colors ${
                      fulfillmentType === "delivery"
                        ? "border-primary bg-primary/10 text-primary-dark"
                        : "border-[#1F443C]/12 bg-white text-ink-soft hover:border-[#1F443C]/25"
                    }`}
                  >
                    {t("fulfillmentDelivery")}
                  </button>
                  <button
                    type="button"
                    role="radio"
                    aria-checked={fulfillmentType === "pickup"}
                    onClick={() => {
                      setCheckoutBanner(null);
                      setFulfillmentType("pickup");
                    }}
                    className={`flex-1 rounded-xl border px-4 py-3 text-sm font-semibold transition-colors ${
                      fulfillmentType === "pickup"
                        ? "border-primary bg-primary/10 text-primary-dark"
                        : "border-[#1F443C]/12 bg-white text-ink-soft hover:border-[#1F443C]/25"
                    }`}
                  >
                    {t("fulfillmentPickup")}
                  </button>
                </div>
              </fieldset>

              {fulfillmentType === "pickup" ? (
                <div className="surface-panel flex flex-col gap-3 rounded-xl border border-[#1F443C]/10 p-4 text-sm text-ink-soft">
                  <div className="flex gap-3">
                    <MapPin className="h-5 w-5 shrink-0 text-primary-dark" aria-hidden />
                    <div>
                      <p className="font-semibold text-ink">{t("pickupLocationTitle")}</p>
                      <p className="mt-1 leading-relaxed">
                        {pickup?.pickup_address ?? t("pickupLocationUnavailableFallback")}
                      </p>
                    </div>
                  </div>
                  {pickup?.pickup_latitude != null && pickup?.pickup_longitude != null ? (
                    <LazyMapPicker
                      center={{
                        lat: Number(pickup.pickup_latitude),
                        lng: Number(pickup.pickup_longitude),
                      }}
                      language={locale}
                      onMarkerChange={() => {}}
                    />
                  ) : (
                    <p className="text-xs text-amber-700">{t("pickupMapUnavailable")}</p>
                  )}
                </div>
              ) : (
                <>
                  {addresses.length ? (
                    <div className="relative">
                      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-soft">
                        {t("savedAddressesTitle")}
                      </label>
                      <button
                        type="button"
                        onClick={() => setAddressMenuOpen((prev) => !prev)}
                        className="input-premium flex w-full items-start justify-between gap-2 py-2 text-start"
                        aria-expanded={addressMenuOpen}
                      >
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-semibold text-ink">
                            {(selectedAddress?.label ?? t("addressNameNone"))}
                            {selectedAddress?.is_default
                              ? ` (${t("defaultAddressBadge")})`
                              : ""}
                          </span>
                          {selectedAddress ? (
                            <span className="mt-0.5 block truncate text-xs text-ink-soft">
                              {selectedAddress.city}, {selectedAddress.street_line},{" "}
                              {selectedAddress.building_number}
                            </span>
                          ) : null}
                        </span>
                        <span className="shrink-0 text-ink-soft">{addressMenuOpen ? "▲" : "▼"}</span>
                      </button>
                      {addressMenuOpen ? (
                        <div className="absolute z-20 mt-2 max-h-72 w-full overflow-auto rounded-xl border border-[#1F443C]/12 bg-white shadow-[var(--shadow-elevated)]">
                          {addresses.map((addr) => (
                            <button
                              key={addr.id}
                              type="button"
                              onClick={() => {
                                applySelectedAddress(addr.id);
                                setAddressMenuOpen(false);
                              }}
                              className="w-full border-b border-[#1F443C]/8 px-3 py-2.5 text-start last:border-0 hover:bg-[#F7F4EE]"
                            >
                              <span className="block text-sm font-semibold text-ink">
                                {addr.label ?? t("addressNameNone")}
                                {addr.is_default ? ` (${t("defaultAddressBadge")})` : ""}
                              </span>
                              <span className="mt-1 block text-xs text-ink-soft">
                                {addr.city}, {addr.street_line}, {addr.building_number}
                              </span>
                            </button>
                          ))}
                        </div>
                      ) : null}
                      {selectedAddressId ? (
                        <a
                          href={addressMapHref(selectedAddress ?? addresses[0])}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-primary-dark hover:underline"
                        >
                          <MapPin className="h-3.5 w-3.5" />
                          {t("openInMap")}
                        </a>
                      ) : null}
                    </div>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => setAddressDraftOpen((prev) => !prev)}
                    className="rounded-xl border border-[#1F443C]/12 bg-white px-4 py-2.5 text-sm font-semibold text-ink-soft"
                  >
                    {addressDraftOpen ? t("hideNewAddressForm") : t("addNewAddress")}
                  </button>
                  {addressDraftOpen ? (
                    <div className="rounded-xl border border-[#1F443C]/10 p-3">
                      <AddressEditor
                        locale={locale}
                        value={addressDraft}
                        onChange={setAddressDraft}
                        t={(key) => t(key as never)}
                      />
                      <button
                        type="button"
                        onClick={async () => {
                          const payload = {
                            label_type: addressDraft.label_type,
                            custom_label: addressDraft.custom_label.trim() || null,
                            city: addressDraft.city.trim(),
                            street_line: addressDraft.street_line.trim(),
                            building_number: addressDraft.building_number.trim(),
                            latitude: addressDraft.latitude,
                            longitude: addressDraft.longitude,
                            is_default: addresses.length === 0,
                          };
                          const res = await fetch("/api/addresses", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify(payload),
                          });
                          const data = await res.json();
                          if (!res.ok) {
                            setCheckoutBanner({
                              type: "error",
                              message:
                                data?.code === "ADDRESS_LIMIT_REACHED"
                                  ? t("addressLimitReached")
                                  : t("addressSaveFailed"),
                            });
                            return;
                          }
                          const next = data.data as CustomerAddress;
                          const refreshed = [next, ...addresses];
                          setAddresses(refreshed);
                          setSelectedAddressId(next.id);
                          setDeliveryAddress(
                            `${next.city}, ${next.street_line}, ${next.building_number}`
                          );
                          setDeliveryLat(next.latitude != null ? Number(next.latitude) : null);
                          setDeliveryLng(next.longitude != null ? Number(next.longitude) : null);
                          setAddressDraftOpen(false);
                          setAddressDraft({
                            label_type: null,
                            custom_label: "",
                            city: "",
                            street_line: "",
                            building_number: "",
                            latitude: null,
                            longitude: null,
                            is_default: false,
                          });
                        }}
                        className="btn-primary-solid mt-3 w-full py-3"
                      >
                        {t("saveAddress")}
                      </button>
                    </div>
                  ) : null}
                  {addressDraftOpen ? (
                    <label className="flex cursor-pointer items-start gap-3 text-sm text-ink">
                      <input
                        type="checkbox"
                        checked={saveAddressToProfile}
                        onChange={(e) => setSaveAddressToProfile(e.target.checked)}
                        className="mt-1 h-4 w-4 rounded border-[#1F443C]/25 text-primary focus:ring-primary"
                      />
                      <span>{t("saveAddressToProfile")}</span>
                    </label>
                  ) : null}
                </>
              )}

              <fieldset className="space-y-2">
                <legend className="mb-1.5 block w-full text-xs font-semibold uppercase tracking-wide text-ink-soft">
                  {t("paymentSection")}
                </legend>
                <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-[#1F443C]/12 bg-white px-4 py-3 text-sm font-medium text-ink">
                  <input
                    type="radio"
                    name="payment_method"
                    checked
                    readOnly
                    className="h-4 w-4 text-primary"
                  />
                  {t("cashOnDelivery")}
                </label>
              </fieldset>

              {profileComplete ? (
                <div className="surface-panel rounded-xl border border-[#1F443C]/10 p-5 text-sm">
                  <p className="font-semibold text-ink">{t("orderContact")}</p>
                  <p className="mt-2 text-ink-soft">
                    {profile!.full_name}
                    <br />
                    {profile!.phone}
                  </p>
                  <Link
                    href="/account"
                    className="mt-4 inline-block text-sm font-semibold text-primary-dark hover:underline"
                  >
                    {t("editInAccount")}
                  </Link>
                </div>
              ) : (
                <>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-soft">
                      {t("name")}
                    </label>
                    <input
                      ref={checkoutNameInputRef}
                      value={name}
                      onChange={(e) => {
                        setCheckoutBanner(null);
                        setName(e.target.value);
                      }}
                      className="input-premium"
                      placeholder={t("namePlaceholder")}
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-soft">
                      {t("phone")}
                    </label>
                    <input
                      ref={checkoutPhoneInputRef}
                      value={phone}
                      onChange={(e) => {
                        setCheckoutBanner(null);
                        setPhone(e.target.value);
                      }}
                      className="input-premium"
                      placeholder={t("phonePlaceholder")}
                    />
                  </div>
                  <p className="text-xs text-ink-soft/85">
                    {t("checkoutProfileHint")}
                  </p>
                </>
              )}
              <button
                type="submit"
                disabled={submissionPhase !== "idle" || !cartReady}
                className="btn-primary-solid w-full py-3.5 disabled:opacity-50"
              >
                {submissionPhase !== "idle" && <Loader2 className="h-4 w-4 animate-spin" />}
                {submissionPhase === "idle" ? t("placeOrder") : t("placingOrder")}
              </button>
            </form>
          </>
        )}
      </main>
    </>
  );
}
