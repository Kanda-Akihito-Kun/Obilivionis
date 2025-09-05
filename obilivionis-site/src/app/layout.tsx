import type { Metadata } from "next";
import { Inter, Noto_Sans_JP } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const notoSansJP = Noto_Sans_JP({
  subsets: ["latin"],
  variable: "--font-noto-sans-jp",
});

export const metadata: Metadata = {
  title: "Oblivionis - 通过日本动画学习日语词汇",
  description: "沉浸式的日语词汇学习体验，通过动画台词学习日语单词、词频、JLPT等级和用法",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body
        className={`${inter.variable} ${notoSansJP.variable} antialiased font-sans`}
      >
        {/* Navigation */}
        <nav className="bg-white dark:bg-gray-900 shadow-sm border-b border-gray-200 dark:border-gray-700">
          <div className="container mx-auto px-4">
            <div className="flex justify-between items-center h-16">
              <Link href="/" className="text-2xl font-bold text-blue-600">
                Oblivionis
              </Link>
              <div className="flex space-x-6">
                 <Link
                   href="/"
                   className="text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                 >
                   首页
                 </Link>
                 <Link
                   href="/series"
                   className="text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                 >
                   动画系列
                 </Link>
                 <Link
                   href="/vocab"
                   className="text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                 >
                   词汇库
                 </Link>
                 <Link
                   href="/search"
                   className="text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                 >
                   搜索
                 </Link>
               </div>
            </div>
          </div>
        </nav>
        
        {children}
        
        {/* Footer */}
        <footer className="bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 mt-16">
          <div className="container mx-auto px-4 py-8">
            <div className="text-center text-gray-600 dark:text-gray-400">
              <p className="mb-2">
                © 2024 Oblivionis
              </p>
              <p className="text-sm">
                数据来源于动画台词，仅供学习使用
              </p>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
