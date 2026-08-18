import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "www.camara.leg.br",
      },
      {
        protocol: "https",
        hostname: "dadosabertos.camara.leg.br",
      },
    ],
  },
};

export default nextConfig;
