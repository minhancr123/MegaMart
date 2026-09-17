import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Make JWT_SECRET available in Edge middleware
  env: {
    JWT_SECRET: process.env.JWT_SECRET,
  },
  images: {
    // hostname: '**' biến /_next/image thành proxy ảnh mở cho mọi tên miền:
    // ai cũng có thể bắt server này tải hộ ảnh bất kỳ. Liệt kê đúng các host
    // đang dùng thật (query trên bảng ProductImage + Post).
    remotePatterns: [
      { protocol: 'https', hostname: 'res.cloudinary.com' },
      { protocol: 'https', hostname: '**.cloudinary.com' },
      // Ảnh gốc của hai sàn đã cào - còn dùng cho tới khi mirror xong toàn bộ.
      { protocol: 'https', hostname: 'cdn.nguyenkimmall.com' },
      { protocol: 'https', hostname: 'cdn11.dienmaycholon.vn' },
      { protocol: 'https', hostname: 'cdn.coreventure.vn' },
      { protocol: 'https', hostname: 'imgs.search.brave.com' },
    ],
    formats: ['image/avif', 'image/webp'], // Modern formats for better performance
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60, // Cache images for 60 seconds
  },
  output: "standalone",
  turbopack: {},
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
