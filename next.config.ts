import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    "meal.1234567.website",
    "localhost:3000",
    "127.0.0.1:3000",
  ],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.mcdonalds.com.jo",
      },
      {
        protocol: "http",
        hostname: "**.mcdonalds.com.jo",
      },
    ],
  },
  headers: async () => [
    {
      // Personal data must never be cached by proxies or the browser; static assets keep Next's defaults.
      source: "/api/:path*",
      headers: [{ key: "Cache-Control", value: "no-store" }],
    },
  ],
};

export default nextConfig;
