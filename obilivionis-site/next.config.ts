import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  
  // 配置静态文件服务
  async rewrites() {
    return [
      {
        source: '/data/:path*',
        destination: '/api/media/:path*'
      }
    ];
  },
  
  // 配置图片域名
  images: {
    domains: ['localhost'],
    unoptimized: true // 对于本地开发，禁用图片优化
  }
};

export default nextConfig;
