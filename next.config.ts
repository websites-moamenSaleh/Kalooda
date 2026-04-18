import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

/**
 * Extra dev origins for cross-origin checks on `/_next/*` (Next 16+).
 * `localhost` is built in, but `127.0.0.1` / `::1` are not — using those URLs
 * otherwise loads HTML then 403s dev chunks and the app looks "broken".
 */
const privateLanDevOrigins = [
  "127.0.0.1",
  "::1",
  "192.168.*.*",
  "10.*.*.*",
  ...Array.from({ length: 16 }, (_, i) => `172.${16 + i}.*.*`),
  "*.local",
];

const nextConfig: NextConfig = {
  // Hide the floating Next.js "N" dev tools badge in the browser (dev only).
  devIndicators: false,
  // Next.js blocks /_next dev assets from "unknown" origins; LAN IPs must be allowlisted.
  allowedDevOrigins: privateLanDevOrigins,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "mxbnmoagdufitnwrmsrn.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
};

const isDev = process.env.NODE_ENV === "development";

export default withSentryConfig(nextConfig, {
  org: "vanguardt",
  project: "javascript-nextjs",
  silent: true,

  // In development, skip source maps and auto-instrumentation — Sentry loads
  // OpenTelemetry and dozens of integrations even when disabled, causing
  // significant dev server overhead with no benefit locally.
  sourcemaps: { disable: isDev },
  autoInstrumentServerFunctions: !isDev,
  autoInstrumentMiddleware: !isDev,
});
