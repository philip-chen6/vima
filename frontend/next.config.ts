import type { NextConfig } from "next";

// in prod (vercel), point at railway-hosted services via env vars
// in dev, both run on localhost
const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:8765";
const MCP_URL = process.env.MCP_URL ?? "http://localhost:8766";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${BACKEND_URL}/:path*`,
      },
      {
        source: '/mcp/:path*',
        destination: `${MCP_URL}/:path*`,
      },
    ];
  },
};

export default nextConfig;
