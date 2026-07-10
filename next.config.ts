import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  reactStrictMode: false,
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
