import type { NextConfig } from "next";

// in prod (docker compose), backend is reachable at http://backend:8765
// in dev, it runs on localhost:8765
const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:8765";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${BACKEND_URL}/:path*`,
      },
    ];
  },
};

export default nextConfig;
