import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Catalog and campaign imagery (src/db/seed-data.ts, src/lib/catalog.ts)
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "/photo-**",
      },
    ],
  },
};

export default nextConfig;
