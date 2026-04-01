"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Candy, LayoutDashboard, Settings, LogOut } from "lucide-react";
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
      <header className="sticky top-0 z-40 border-b border-stone-200 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <Link href="/" className="flex items-center gap-2 group">
            <Candy className="h-6 w-6 text-primary group-hover:rotate-12 transition-transform" />
            <span className="text-lg font-bold text-stone-900">SweetDrop</span>
          </Link>
          <div className="flex items-center gap-3">
            {profile?.full_name && (
              <span className="hidden sm:block text-sm text-stone-600">
                {profile.full_name}
              </span>
            )}
            <LanguageSwitcher />
            <button
              onClick={signOut}
              className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-stone-600 hover:bg-stone-100 transition-colors"
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
                    : "border-transparent text-stone-500 hover:text-stone-700 hover:border-stone-300"
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
