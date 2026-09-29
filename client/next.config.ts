import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // LƯU Ý (prod/Docker): KHÔNG đưa JWT_SECRET vào block `env` ở đây vì Next
  // sẽ bake cứng giá trị lúc build (lúc đó chưa có secret prod) -> middleware
  // Edge runtime thấy undefined và đá mọi route auth về /auth.
  // Middleware đọc process.env.JWT_SECRET trực tiếp lúc runtime trong
  // container (xem docker-compose.prod.yml: client dùng chung .env.prod).
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
      { protocol: 'https', hostname: 'i.pravatar.cc' },
      // Ảnh sản phẩm giờ nằm trong bucket R2 của chính domain này, nginx
      // proxy đường dẫn /products/** sang r2.dev.
      { protocol: 'https', hostname: 'megamart24.tech', pathname: '/products/**' },
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
  // Chỉ dùng khi chạy `next dev` với API ở máy khác (vd trỏ sang production để
  // test e2e có dữ liệu thật). API production không trả Access-Control-Allow-Origin
  // nên trình duyệt chặn, và mọi test chạm tới dữ liệu API sẽ fail. Proxy qua
  // dev server của chính Next giúp mọi request thành cùng origin.
  async rewrites() {
    // Chặn cả production: nếu ai đó build kèm biến này thì rewrite sẽ bị bake
    // cứng vào manifest và chạy cả trong container, đẩy /api của production
    // sang một host khác.
    if (process.env.NODE_ENV === 'production' || !process.env.DEV_API_PROXY_TARGET) return [];
    return [
      {
        source: "/api/:path*",
        // Bỏ dấu `/` cuối để không sinh ra `//api/...` khi biến được cấu hình
        // kèm dấu gạch chéo.
        destination: `${process.env.DEV_API_PROXY_TARGET.replace(/\/+$/, '')}/api/:path*`,
      },
    ];
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
