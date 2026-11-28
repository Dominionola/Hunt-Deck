import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Isolate this local development server from other agents' Next.js caches.
  ...(process.env.NODE_ENV === "development" && process.env.HUNTDECK_ISOLATED_DEV === "1" ? { distDir: ".local-services/next-dev" } : {}),
  allowedDevOrigins: [
    "*.trycloudflare.com",
    "fresh-joseph-camping-sheriff.trycloudflare.com",
    "broken-flip-processors-pastor.trycloudflare.com",
    "localhost:3000",
    "127.0.0.1:3000",
  ],
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          {
            key: "Content-Security-Policy",
            value: "frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
