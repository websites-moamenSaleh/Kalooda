"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Settings, LogOut } from "lucide-react";
import { useLanguage } from "@/contexts/language-context";
import { useAdminAuth } from "@/contexts/admin-auth-context";
import { LanguageSwitcher } from "@/components/language-switcher";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { t } = useLanguage();
  const { profile, signOut } = useAdminAuth();

  if (pathname === "/admin/sign-in") {
    return (
      <div className="min-h-screen bg-stone-50">
        {children}
      </div>
    );
  }

  const isSuperAdmin = profile?.role === "super_admin";

  const navItems = [
    { href: "/admin", labelKey: "dashboard" as const, icon: LayoutDashboard },
    ...(isSuperAdmin
      ? [{ href: "/admin/functions", labelKey: "functions" as const, icon: Settings }]
      : []),
  ];

  return (
    <div className="min-h-screen bg-stone-50">
      <header className="sticky top-0 z-40 border-b border-[#D3A94C]/25 bg-[#1F443C]/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <Link href="/" className="flex items-center group">
            <Image
              src="/brand/logo-transparent.png"
              alt="Kalooda"
              width={120}
              height={62}
              className="h-8 w-auto object-contain transition-opacity group-hover:opacity-80"
            />
          </Link>
          <div className="flex items-center gap-3">
            {profile?.full_name && (
              <span className="hidden sm:block text-sm text-[#F5E6C8]/60">
                {profile.full_name}
              </span>
            )}
            <LanguageSwitcher />
            <button
              onClick={signOut}
              className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-[#F5E6C8]/70 hover:text-[#D3A94C] hover:bg-white/5 transition-colors"
            >
              <LogOut className="h-4 w-4" />
              {t("signOut")}
            </button>
          </div>
        </div>

        <nav className="mx-auto flex max-w-7xl gap-1 px-4 sm:px-6">
          {navItems.map((item) => {
            const isActive =
              item.href === "/admin"
                ? pathname === "/admin"
                : pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-1.5 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? "border-primary text-primary"
                    : "border-transparent text-[#F5E6C8]/60 hover:text-[#F5E6C8] hover:border-[#F5E6C8]/30"
                }`}
              >
                <Icon className="h-4 w-4" />
                {t(item.labelKey)}
              </Link>
            );
          })}
        </nav>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}
