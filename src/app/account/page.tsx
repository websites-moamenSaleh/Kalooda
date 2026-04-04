"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/auth-context";
import { getSupabaseCustomerBrowser } from "@/lib/supabase-client-customer";
import { useLanguage } from "@/contexts/language-context";
import { Header } from "@/components/header";
import { CartDrawer } from "@/components/cart-drawer";
import { AccountSubnav } from "@/components/account-subnav";
import { ArrowLeft, Loader2, KeyRound } from "lucide-react";
import Link from "next/link";
import { useCartDrawerEvent } from "@/hooks/use-cart-drawer-event";

export default function AccountPage() {
  const { user, profile, refreshProfile, loading } = useAuth();
  const { t } = useLanguage();
  const [cartOpen, setCartOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);

  useCartDrawerEvent(setCartOpen);

  useEffect(() => {
    if (!profile) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrate form fields when profile loads
    setName(profile.full_name ?? "");
    setPhone(profile.phone ?? "");
  }, [profile]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!user?.id) return;
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
      alert(t("profileSaveFailedToast"));
      return;
    }
    await refreshProfile();
    alert(t("profileSavedToast"));
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
          <form onSubmit={handleSave} className="space-y-5">
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
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="input-premium"
                  placeholder={t("fullNamePlaceholder")}
                />
              </div>
              <div className="mt-5">
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-soft">
                  {t("phone")}
                </label>
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="input-premium"
                  placeholder={t("phonePlaceholder")}
                />
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
        )}
      </main>
    </>
  );
}
