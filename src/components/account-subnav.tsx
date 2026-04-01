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
        : "text-[#F5E6C8]/60 hover:bg-white/5 hover:text-[#F5E6C8]"
    }`;

  return (
    <nav className="mb-8 flex flex-wrap gap-2 border-b border-[#D3A94C]/20 pb-4">
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
