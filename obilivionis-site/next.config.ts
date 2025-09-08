import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  
  // 配置静态文件服务 - 直接服务data目录下的文件
  async rewrites() {
    return [
      {
        source: '/data/:path*',
        destination: '/data/:path*'
      },
      // 重定向旧的API媒体路径到新的data路径
      {
        source: '/api/media/:path*',
        destination: '/data/:path*'
      }
    ];
  },
  
  // 配置图片域名
  images: {
    domains: ['localhost'],
    unoptimized: true // 对于本地开发，禁用图片优化
  },
  
  // 配置静态文件目录
  async headers() {
    return [
      {
        source: '/data/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable'
          }
        ]
      }
    ];
  }
};

export default nextConfig;
