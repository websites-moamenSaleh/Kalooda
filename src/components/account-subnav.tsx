"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLanguage } from "@/contexts/language-context";

export function AccountSubnav() {
  const pathname = usePathname();
  const { t } = useLanguage();

  const linkCls = (active: boolean) =>
    `rounded-lg px-4 py-2.5 text-sm font-semibold transition-all ${
      active
        ? "bg-[#0A2923] text-[#FFEC94] shadow-md"
        : "text-ink-soft hover:bg-[#1F443C]/8 hover:text-ink"
    }`;

  return (
    <nav className="mb-10 flex flex-wrap gap-2 rounded-xl border border-[#1F443C]/10 bg-[#E0EBE6]/50 p-2">
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
