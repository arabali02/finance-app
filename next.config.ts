import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // отчёты кассы за длинный период — тысячи строк
    serverActions: { bodySizeLimit: "10mb" },
  },
};

export default nextConfig;
