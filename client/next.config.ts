import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      },
      {
        protocol: 'https',
        hostname: 'imgs.search.brave.com',
      },
      {
        protocol: 'https',
        hostname: '**.cloudinary.com',
      },
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
    formats: ['image/avif', 'image/webp'], // Modern formats for better performance
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60, // Cache images for 60 seconds
  },
  output: "standalone",
  typescript: {
    ignoreBuildErrors: true,
  },
  webpack: (config) => {
    // Handle GLTF/GLB files
    config.module.rules.push({
      test: /\.(gltf|glb)$/,
      type: 'asset/resource',
    });
    return config;
  },
};

export default nextConfig;
