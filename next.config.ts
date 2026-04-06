import type { NextConfig } from "next";

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
        hostname: "nnciyjfqoggfavfettbm.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
      {
        protocol: "https",
        hostname: "mxbnmoagdufitnwrmsrn.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
};

export default nextConfig;
