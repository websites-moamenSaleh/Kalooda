"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/auth-context";
import { getSupabaseCustomerBrowser } from "@/lib/supabase-client-customer";
import { useLanguage } from "@/contexts/language-context";
import { Header } from "@/components/header";
import { CartDrawer } from "@/components/cart-drawer";
import { AccountSubnav } from "@/components/account-subnav";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";

export default function AccountPage() {
  const { user, profile, refreshProfile, loading } = useAuth();
  const { t } = useLanguage();
  const [cartOpen, setCartOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setName(profile.full_name ?? "");
      setPhone(profile.phone ?? "");
    }
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

      <main className="mx-auto max-w-lg px-4 py-10">
        <Link
          href="/"
          className="mb-6 inline-flex items-center gap-1 text-sm text-[#F5E6C8]/60 hover:text-primary transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("backToShop")}
        </Link>

        <h1 className="text-2xl font-bold text-[#F5E6C8]">{t("myProfile")}</h1>

        <div className="mt-6">
          <AccountSubnav />
        </div>

        {loading ? (
          <p className="text-[#F5E6C8]/50">{t("loadingProducts")}</p>
        ) : (
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#F5E6C8]/70">
                {t("email")}
              </label>
              <input
                readOnly
                value={user?.email ?? ""}
                className="mt-1 w-full cursor-not-allowed rounded-lg border border-[#D3A94C]/10 bg-[#163530] px-3 py-2 text-sm text-[#F5E6C8]/50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#F5E6C8]/70">
                {t("fullName")}
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 w-full rounded-lg border border-[#D3A94C]/20 bg-[#163530] px-3 py-2 text-sm text-[#F5E6C8] outline-none placeholder:text-[#F5E6C8]/30 focus:border-primary focus:ring-2 focus:ring-primary/20"
                placeholder={t("fullNamePlaceholder")}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#F5E6C8]/70">
                {t("phone")}
              </label>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="mt-1 w-full rounded-lg border border-[#D3A94C]/20 bg-[#163530] px-3 py-2 text-sm text-[#F5E6C8] outline-none placeholder:text-[#F5E6C8]/30 focus:border-primary focus:ring-2 focus:ring-primary/20"
                placeholder={t("phonePlaceholder")}
              />
            </div>
            <button
              type="submit"
              disabled={saving}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-bold text-[#0A2923] shadow-sm hover:bg-primary-dark transition-colors disabled:opacity-50"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {saving ? t("saving") : t("saveProfile")}
            </button>
          </form>
        )}
      </main>
    </>
  );
}
