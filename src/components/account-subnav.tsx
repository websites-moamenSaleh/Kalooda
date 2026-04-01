"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLanguage } from "@/contexts/language-context";

export function AccountSubnav() {
  const pathname = usePathname();
  const { t } = useLanguage();

  const linkCls = (active: boolean) =>
    `rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
      active
        ? "bg-primary/10 text-primary"
        : "text-stone-600 hover:bg-stone-100"
    }`;

  return (
    <nav className="mb-8 flex flex-wrap gap-2 border-b border-stone-200 pb-4">
      <Link href="/account" className={linkCls(pathname === "/account")}>
        {t("myProfile")}
      </Link>
      <Link
        href="/account/orders"
        className={linkCls(pathname === "/account/orders")}
      >
        {t("myOrders")}
      </Link>
    </nav>
  );
}
