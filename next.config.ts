import type { NextConfig } from "next";

/** Private LAN hostnames so `next dev` works from phones/tablets (see allowedDevOrigins). */
const privateLanDevOrigins = [
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
    ],
  },
};

export default nextConfig;
