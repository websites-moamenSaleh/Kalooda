"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/auth-context";
import { getSupabaseCustomerBrowser } from "@/lib/supabase-client-customer";
import { useLanguage } from "@/contexts/language-context";
import { Header } from "@/components/header";
import { CartDrawer } from "@/components/cart-drawer";
import { AccountSubnav } from "@/components/account-subnav";
import { ArrowLeft, Loader2, KeyRound } from "lucide-react";
import Link from "next/link";
import { useCartDrawerEvent } from "@/hooks/use-cart-drawer-event";
import { InlineBanner } from "@/components/inline-banner";

type ProfileMessage =
  | null
  | { variant: "success" | "error"; text: string };

export default function AccountPage() {
  const { user, profile, refreshProfile, loading } = useAuth();
  const { t, locale, setLocale } = useLanguage();
  const [cartOpen, setCartOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [saving, setSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState<ProfileMessage>(null);
  const profileNameInputRef = useRef<HTMLInputElement>(null);
  const profilePhoneInputRef = useRef<HTMLInputElement>(null);

  useCartDrawerEvent(setCartOpen);

  useEffect(() => {
    if (!profile) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrate form fields when profile loads
    setName(profile.full_name ?? "");
    setPhone(profile.phone ?? "");
    setDeliveryAddress(profile.delivery_address ?? "");
  }, [profile]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!user?.id) return;
    setProfileMessage(null);

    const trimmedName = name.trim();
    const trimmedPhone = phone.trim();
    if (!trimmedName || !trimmedPhone) {
      setProfileMessage({
        variant: "error",
        text: t("profileValidationNamePhoneRequired"),
      });
      requestAnimationFrame(() => {
        if (!trimmedName) profileNameInputRef.current?.focus();
        else profilePhoneInputRef.current?.focus();
      });
      return;
    }

    setSaving(true);
    const supabase = getSupabaseCustomerBrowser();
    const trimmedAddr = deliveryAddress.trim();
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: name.trim() || null,
        phone: phone.trim() || null,
        delivery_address: trimmedAddr ? trimmedAddr : null,
      })
      .eq("id", user.id);
    setSaving(false);
    if (error) {
      setProfileMessage({
        variant: "error",
        text: t("profileSaveFailedToast"),
      });
      return;
    }
    await refreshProfile();
    setProfileMessage({
      variant: "success",
      text: t("profileSavedToast"),
    });
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
          {t("myProfile")}
        </h1>

        <div className="mt-8">
          <AccountSubnav />
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-9 w-9 animate-spin text-primary" />
          </div>
        ) : (
          <>
          <form noValidate onSubmit={handleSave} className="space-y-5">
            {profileMessage ? (
              <InlineBanner
                variant={profileMessage.variant}
                className="text-start"
              >
                <p>{profileMessage.text}</p>
              </InlineBanner>
            ) : null}
            <div className="surface-panel rounded-xl border border-[#1F443C]/10 p-5 sm:p-6">
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-soft">
                  {t("email")}
                </label>
                <input
                  readOnly
                  value={user?.email ?? ""}
                  className="input-premium cursor-not-allowed bg-[#E0EBE6]/80 text-ink-soft"
                />
              </div>
              <div className="mt-5">
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-soft">
                  {t("fullName")}
                </label>
                <input
                  ref={profileNameInputRef}
                  value={name}
                  onChange={(e) => {
                    setProfileMessage(null);
                    setName(e.target.value);
                  }}
                  className="input-premium"
                  placeholder={t("fullNamePlaceholder")}
                />
              </div>
              <div className="mt-5">
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-soft">
                  {t("phone")}
                </label>
                <input
                  ref={profilePhoneInputRef}
                  value={phone}
                  onChange={(e) => {
                    setProfileMessage(null);
                    setPhone(e.target.value);
                  }}
                  className="input-premium"
                  placeholder={t("phonePlaceholder")}
                />
              </div>
              <div className="mt-5">
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-soft">
                  {t("accountDeliveryAddress")}
                </label>
                <textarea
                  value={deliveryAddress}
                  onChange={(e) => {
                    setProfileMessage(null);
                    setDeliveryAddress(e.target.value);
                  }}
                  rows={3}
                  className="input-premium min-h-[5rem] resize-y"
                  placeholder={t("accountDeliveryAddressPlaceholder")}
                  autoComplete="street-address"
                />
              </div>
              <div className="mt-5">
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-soft">
                  {t("language")}
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setProfileMessage(null);
                      setLocale("en");
                    }}
                    className={`flex-1 rounded-lg border py-2.5 text-sm font-semibold transition-colors ${
                      locale === "en"
                        ? "border-primary bg-primary/10 text-primary-dark"
                        : "border-[#1F443C]/12 bg-white text-ink-soft hover:border-[#1F443C]/25"
                    }`}
                  >
                    English
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setProfileMessage(null);
                      setLocale("ar");
                    }}
                    className={`flex-1 rounded-lg border py-2.5 text-sm font-semibold transition-colors ${
                      locale === "ar"
                        ? "border-primary bg-primary/10 text-primary-dark"
                        : "border-[#1F443C]/12 bg-white text-ink-soft hover:border-[#1F443C]/25"
                    }`}
                  >
                    العربية
                  </button>
                </div>
              </div>
            </div>
            <button
              type="submit"
              disabled={saving}
              className="btn-primary-solid w-full py-3.5 disabled:opacity-50"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {saving ? t("saving") : t("saveProfile")}
            </button>
          </form>

          <div className="mt-4">
            <Link
              href="/auth/forgot-password"
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#1F443C]/12 bg-white py-3.5 text-sm font-semibold text-ink-soft transition-colors hover:border-[#1F443C]/25 hover:text-ink"
            >
              <KeyRound className="h-4 w-4" />
              {t("changePassword")}
            </Link>
          </div>
          </>
        )}
      </main>
    </>
  );
}
