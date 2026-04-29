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
  experimental: {
    // Fewer modules to compile/transform on each dev refresh (large icon sets).
    optimizePackageImports: ["lucide-react"],
  },
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

const isProductionBuild = process.env.NODE_ENV === "production";

export default withSentryConfig(nextConfig, {
  org: "vanguardt",
  project: "javascript-nextjs",

  // Upload source maps to Sentry for readable stack traces.
  // Requires SENTRY_AUTH_TOKEN env var (set in Vercel, not committed).
  silent: true,

  // Sentry webpack injection is for production builds; skipping it in dev
  // avoids extra compilation work on every `next dev` refresh.
  ...(isProductionBuild
    ? {
        webpack: {
          autoInstrumentServerFunctions: true,
          autoInstrumentMiddleware: true,
          treeshake: {
            removeDebugLogging: true,
          },
        },
      }
    : {
        disableSentryConfig: true,
      }),
});
