import type { NextConfig } from "next";

const backendUrl = (process.env.BACKEND_URL || "http://127.0.0.1:8000").replace(/\/$/, "");

const nextConfig: NextConfig = {
  env: {
    // This is the public API address, never a credential. Keep local development
    // on the same-origin rewrite when BACKEND_URL is not configured.
    NEXT_PUBLIC_API_BASE: process.env.BACKEND_URL ? `${backendUrl}/api` : "/api",
  },
  experimental: { proxyTimeout: 300000 },
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${backendUrl}/api/:path*` }];
  },
};

export default nextConfig;
