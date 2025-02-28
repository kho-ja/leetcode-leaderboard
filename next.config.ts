import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**", // This will allow all image sources
      },
    ],
    domains: ["assets.leetcode.com", "leetcode.com"],
  },
};

export default nextConfig;
