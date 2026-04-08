import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Cormorant_Garamond } from "next/font/google";
import { Noto_Sans_Arabic } from "next/font/google";
import { cookies, headers } from "next/headers";
import { CartProvider } from "@/contexts/cart-context";
import { LanguageProvider } from "@/contexts/language-context";
import { AuthProvider } from "@/contexts/auth-context";
import { AdminAuthProvider } from "@/contexts/admin-auth-context";
import { FlyToCartProvider } from "@/contexts/fly-to-cart-context";
import { PWARegister } from "@/components/pwa-register";
import { LocaleSync } from "@/components/locale-sync";
import {
  LOCALE_COOKIE_NAME,
  parseLocaleCookie,
} from "@/lib/locale-preference";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const notoArabic = Noto_Sans_Arabic({
  variable: "--font-noto-arabic",
  subsets: ["arabic"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Kalooda — Cheesecake And More",
  description:
    "Hand-crafted cheesecakes and more. Order online and get same-day delivery.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Kalooda",
  },
};

export const viewport: Viewport = {
  themeColor: "#0a2923",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const cookieValue = cookieStore.get(LOCALE_COOKIE_NAME)?.value;
  let locale = parseLocaleCookie(cookieValue);
  if (!cookieValue) {
    const headersList = await headers();
    const acceptLang = headersList.get("accept-language") ?? "";
    if (acceptLang.toLowerCase().includes("ar")) locale = "ar";
  }
  const dir = locale === "ar" ? "rtl" : "ltr";

  return (
    <html
      lang={locale}
      dir={dir}
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${cormorant.variable} ${notoArabic.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">
        <LanguageProvider initialLocale={locale}>
          <AuthProvider>
            <AdminAuthProvider>
              <CartProvider>
                <FlyToCartProvider>
                  <LocaleSync />
                  {children}
                  <PWARegister />
                </FlyToCartProvider>
              </CartProvider>
            </AdminAuthProvider>
          </AuthProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
