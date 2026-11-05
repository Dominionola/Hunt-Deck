import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    "*.trycloudflare.com",
    "fresh-joseph-camping-sheriff.trycloudflare.com",
    "broken-flip-processors-pastor.trycloudflare.com",
    "localhost:3000",
    "127.0.0.1:3000",
  ],
};

export default nextConfig;
