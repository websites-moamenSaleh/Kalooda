import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Noto_Sans_Arabic } from "next/font/google";
import { cookies } from "next/headers";
import { CartProvider } from "@/contexts/cart-context";
import { LanguageProvider } from "@/contexts/language-context";
import { AuthProvider } from "@/contexts/auth-context";
import { AdminAuthProvider } from "@/contexts/admin-auth-context";
import { PWARegister } from "@/components/pwa-register";
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

const notoArabic = Noto_Sans_Arabic({
  variable: "--font-noto-arabic",
  subsets: ["arabic"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "SweetDrop — Fresh Sweets, Delivered Fast",
  description:
    "Hand-crafted chocolates, gummies, pastries & more. Order online and get same-day delivery.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "SweetDrop",
  },
};

export const viewport: Viewport = {
  themeColor: "#e11d48",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const locale = parseLocaleCookie(
    cookieStore.get(LOCALE_COOKIE_NAME)?.value
  );
  const dir = locale === "ar" ? "rtl" : "ltr";

  return (
    <html
      lang={locale}
      dir={dir}
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${notoArabic.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">
        <LanguageProvider initialLocale={locale}>
          <AuthProvider>
            <AdminAuthProvider>
              <CartProvider>
                {children}
                <PWARegister />
              </CartProvider>
            </AdminAuthProvider>
          </AuthProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
