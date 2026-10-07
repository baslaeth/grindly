import type { NextConfig } from "next";
import { parseEnvironment } from "./src/config/environment";

parseEnvironment(process.env);

const config: NextConfig = {
  devIndicators: false,
  poweredByHeader: false,
  reactStrictMode: true,
  // Private snapshots must stay fresh during the local review as well as production.
  experimental: { serverComponentsHmrCache: false },
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "www.grindly.io" }],
        destination: "https://grindly.io/:path*",
        permanent: true,
      },
      {
        source: "/:path*",
        has: [{ type: "host", value: "grindly-woad.vercel.app" }],
        destination: "https://grindly.io/:path*",
        permanent: true,
      },
      { source: "/submit", destination: "/findings/new", permanent: true },
      {
        source: "/contribution",
        destination: "/findings/latest",
        permanent: true,
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "no-referrer" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};

export default config;
