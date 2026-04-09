"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/auth-context";
import { getSupabaseCustomerBrowser } from "@/lib/supabase-client-customer";
import { useLanguage } from "@/contexts/language-context";
import { Header } from "@/components/header";
import { CartDrawer } from "@/components/cart-drawer";
import { AccountSubnav } from "@/components/account-subnav";
import { ArrowLeft, Loader2, KeyRound, MapPinned } from "lucide-react";
import Link from "next/link";
import { useCartDrawerEvent } from "@/hooks/use-cart-drawer-event";
import { InlineBanner } from "@/components/inline-banner";
import { AddressEditor, type AddressDraft } from "@/components/address-editor";
import type { CustomerAddress } from "@/types/database";

type ProfileMessage =
  | null
  | { variant: "success" | "error"; text: string };

function addressMapHref(addr: CustomerAddress): string {
  if (addr.latitude != null && addr.longitude != null) {
    return `https://www.google.com/maps?q=${addr.latitude},${addr.longitude}`;
  }
  const query = `${addr.city}, ${addr.street_line}, ${addr.building_number}`;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

export default function AccountPage() {
  const { user, profile, refreshProfile, loading } = useAuth();
  const { t, locale, setLocale } = useLanguage();
  const [cartOpen, setCartOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [addresses, setAddresses] = useState<CustomerAddress[]>([]);
  const [addressesLoading, setAddressesLoading] = useState(false);
  const [addressSaving, setAddressSaving] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [addressFormOpen, setAddressFormOpen] = useState(false);
  const [addressMessage, setAddressMessage] = useState<ProfileMessage>(null);
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
  const [profileMessage, setProfileMessage] = useState<ProfileMessage>(null);
  const profileNameInputRef = useRef<HTMLInputElement>(null);
  const profilePhoneInputRef = useRef<HTMLInputElement>(null);

  useCartDrawerEvent(setCartOpen);

  useEffect(() => {
    if (!profile) return;
    setName(profile.full_name ?? "");
    setPhone(profile.phone ?? "");
  }, [profile]);

  async function loadAddresses() {
    if (!user?.id) return;
    setAddressesLoading(true);
    try {
      const res = await fetch("/api/addresses");
      const data = await res.json();
      if (!res.ok) return;
      setAddresses((data.data ?? []) as CustomerAddress[]);
    } finally {
      setAddressesLoading(false);
    }
  }

  useEffect(() => {
    void loadAddresses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

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
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: name.trim() || null,
        phone: phone.trim() || null,
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

  function resetAddressDraft() {
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
    setEditingAddressId(null);
    setAddressFormOpen(false);
  }

  async function handleSaveAddress(e: React.FormEvent) {
    e.preventDefault();
    setAddressMessage(null);
    if (!addressDraft.city.trim() || !addressDraft.street_line.trim() || !addressDraft.building_number.trim()) {
      setAddressMessage({ variant: "error", text: t("addressThreeSectionsRequired") });
      return;
    }

    setAddressSaving(true);
    const payload = {
      label_type: addressDraft.label_type,
      custom_label: addressDraft.custom_label.trim() || null,
      city: addressDraft.city.trim(),
      street_line: addressDraft.street_line.trim(),
      building_number: addressDraft.building_number.trim(),
      latitude: addressDraft.latitude,
      longitude: addressDraft.longitude,
      is_default: Boolean(addressDraft.is_default),
    };
    try {
      const res = await fetch(
        editingAddressId ? `/api/addresses/${editingAddressId}` : "/api/addresses",
        {
          method: editingAddressId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        setAddressMessage({
          variant: "error",
          text:
            data?.code === "ADDRESS_LIMIT_REACHED"
              ? t("addressLimitReached")
              : t("addressSaveFailed"),
        });
        return;
      }
      resetAddressDraft();
      setAddressMessage({ variant: "success", text: t("addressSaved") });
      await loadAddresses();
    } finally {
      setAddressSaving(false);
    }
  }

  async function handleDeleteAddress(id: string) {
    const res = await fetch(`/api/addresses/${id}`, { method: "DELETE" });
    if (!res.ok) {
      setAddressMessage({ variant: "error", text: t("addressDeleteFailed") });
      return;
    }
    setAddressMessage({ variant: "success", text: t("addressDeleted") });
    await loadAddresses();
  }

  function editAddress(addr: CustomerAddress) {
    setAddressFormOpen(true);
    setEditingAddressId(addr.id);
    setAddressDraft({
      label_type: addr.label_type,
      custom_label: addr.custom_label ?? "",
      city: addr.city,
      street_line: addr.street_line,
      building_number: addr.building_number,
      latitude: addr.latitude != null ? Number(addr.latitude) : null,
      longitude: addr.longitude != null ? Number(addr.longitude) : null,
      is_default: addr.is_default,
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

          <section className="surface-panel mt-6 rounded-xl border border-[#1F443C]/10 p-5 sm:p-6">
            <h2 className="text-sm font-semibold text-ink">{t("savedAddressesTitle")}</h2>
            <p className="mt-1 text-xs text-ink-soft">{t("savedAddressesHint")}</p>
            {addressMessage ? (
              <InlineBanner variant={addressMessage.variant} className="mt-4 text-start">
                <p>{addressMessage.text}</p>
              </InlineBanner>
            ) : null}
            <div className="mt-4 space-y-3">
              {addressesLoading ? (
                <p className="text-sm text-ink-soft">{t("loadingAddresses")}</p>
              ) : addresses.length ? (
                addresses.map((addr) => (
                  <div
                    key={addr.id}
                    className="rounded-lg border border-[#1F443C]/10 bg-white p-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-ink">
                          {(addr.label ?? t("addressNameNone"))}{" "}
                          {addr.is_default ? `(${t("defaultAddressBadge")})` : ""}
                        </p>
                        <p className="mt-1 text-sm text-ink-soft">
                          {addr.city}, {addr.street_line}, {addr.building_number}
                        </p>
                        <a
                          href={addressMapHref(addr)}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-primary-dark hover:underline"
                        >
                          <MapPinned className="h-3.5 w-3.5" />
                          {t("openInMap")}
                        </a>
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => editAddress(addr)}
                          className="rounded-md border border-[#1F443C]/15 px-2 py-1 text-xs font-semibold text-ink-soft"
                        >
                          {t("edit")}
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDeleteAddress(addr.id)}
                          className="rounded-md border border-red-200 px-2 py-1 text-xs font-semibold text-red-700"
                        >
                          {t("remove")}
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-ink-soft">{t("noSavedAddresses")}</p>
              )}
            </div>

            {addressFormOpen ? (
              <form onSubmit={handleSaveAddress} className="mt-4 space-y-3">
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-soft">
                  {editingAddressId ? t("editAddress") : t("addAddress")}
                </label>
                <AddressEditor
                  locale={locale}
                  value={addressDraft}
                  onChange={setAddressDraft}
                  t={(key) => t(key as never)}
                />
                <label className="flex cursor-pointer items-center gap-3 text-sm text-ink">
                  <input
                    type="checkbox"
                    checked={Boolean(addressDraft.is_default)}
                    onChange={(e) =>
                      setAddressDraft((prev) => ({ ...prev, is_default: e.target.checked }))
                    }
                    className="h-4 w-4 rounded border-[#1F443C]/25 text-primary focus:ring-primary"
                  />
                  <span>{t("setAsDefaultAddress")}</span>
                </label>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={addressSaving}
                    className="btn-primary-solid flex-1 py-3 disabled:opacity-50"
                  >
                    {addressSaving ? t("saving") : t("saveAddress")}
                  </button>
                  <button
                    type="button"
                    onClick={resetAddressDraft}
                    className="rounded-xl border border-[#1F443C]/12 bg-white px-4 py-3 text-sm font-semibold text-ink-soft"
                  >
                    {t("cancel")}
                  </button>
                </div>
              </form>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setEditingAddressId(null);
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
                  setAddressFormOpen(true);
                }}
                className="btn-primary-solid mt-4 w-full py-3"
              >
                {t("addAddress")}
              </button>
            )}
          </section>

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
