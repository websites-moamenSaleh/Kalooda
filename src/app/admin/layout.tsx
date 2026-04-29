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
    return <div className="min-h-screen admin-canvas">{children}</div>;
  }

  const isSuperAdmin = profile?.role === "super_admin";

  const navItems = [
    { href: "/admin", labelKey: "dashboard" as const, icon: LayoutDashboard },
    ...(isSuperAdmin
      ? [{ href: "/admin/functions", labelKey: "functions" as const, icon: Settings }]
      : []),
  ];

  return (
    <div className="min-h-screen w-full min-w-0 admin-canvas">
      <header className="sticky top-0 z-40 w-full min-w-0 border-b border-[#1F443C]/12 bg-gradient-to-b from-[#0A2923] to-[#123A33] shadow-md">
        <div className="mx-auto flex w-full min-w-0 max-w-7xl items-center justify-between gap-2 px-4 py-3 sm:gap-3 sm:px-6">
          <Link href="/" className="group flex shrink-0 items-center">
            <Image
              src="/brand/logo-transparent.png"
              alt="Kalooda"
              width={120}
              height={62}
              className="brand-logo-outline h-8 w-auto object-contain transition-opacity group-hover:opacity-90"
            />
          </Link>
          <div className="flex min-w-0 shrink items-center gap-1.5 sm:gap-3">
            {profile?.full_name && (
              <span className="hidden max-w-[10rem] truncate text-sm text-[#A8B5AD]/75 sm:block">
                {profile.full_name}
              </span>
            )}
            <LanguageSwitcher className="flex min-w-0 items-center gap-1.5 rounded-lg border border-[#D3A94C]/20 px-2 py-2 text-xs font-medium text-[#E5EDE8]/85 transition-colors hover:bg-white/[0.06] hover:text-[#FFEC94] sm:px-3 sm:text-sm max-sm:[&_span]:max-w-[5.5rem] max-sm:[&_span]:truncate" />
            <button
              type="button"
              onClick={signOut}
              className="flex items-center gap-1.5 rounded-lg px-2 py-2 text-sm font-medium text-[#E5EDE8]/75 transition-colors hover:bg-white/[0.06] hover:text-[#FFEC94] sm:px-3"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">{t("signOut")}</span>
            </button>
          </div>
        </div>

        <nav className="mx-auto flex w-full min-w-0 max-w-7xl gap-0.5 border-t border-white/[0.06] px-2 sm:px-6">
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
                className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition-colors ${
                  isActive
                    ? "border-[#FFEC94] text-[#FFEC94]"
                    : "border-transparent text-[#A8B5AD]/65 hover:border-[#D3A94C]/25 hover:text-[#E5EDE8]"
                }`}
              >
                <Icon className="h-4 w-4 opacity-80" />
                {t(item.labelKey)}
              </Link>
            );
          })}
        </nav>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
        {children}
      </main>
    </div>
  );
}
