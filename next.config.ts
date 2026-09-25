import type { NextConfig } from "next";
import { parseEnvironment } from "./src/config/environment";

parseEnvironment(process.env);

const config: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  async redirects() {
    return [
      { source: "/", destination: "/join", permanent: false },
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
