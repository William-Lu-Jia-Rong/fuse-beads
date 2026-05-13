import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Link from "next/link";
import { Toaster } from "react-hot-toast";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Fuse Beads Analyzer",
  description: "AI-powered fuse beads pattern analyzer",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body
        suppressHydrationWarning
        className={`${inter.variable} antialiased bg-[#fbfbfd] text-[#1d1d1f] min-h-screen flex flex-col font-sans selection:bg-[#0066cc] selection:text-white`}
      >
        <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200">
          <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between text-sm font-medium">
            <div className="flex items-center gap-6">
              <Link href="/" className="text-black font-semibold text-base tracking-tight">
                Fuse Beads
              </Link>
              <nav className="hidden md:flex gap-6 text-gray-500">
                <Link href="/" className="hover:text-black transition-colors">
                  分析
                </Link>
                <Link href="/history" className="hover:text-black transition-colors">
                  历史与统计
                </Link>
              </nav>
            </div>
            <div className="flex items-center gap-4">
              <Link
                href="/settings"
                className="text-gray-500 hover:text-black transition-colors"
              >
                设置
              </Link>
            </div>
          </div>
        </header>
        <main className="flex-1 w-full max-w-5xl mx-auto p-4 sm:p-6 md:p-8">
          {children}
        </main>
        <Toaster
          position="bottom-center"
          toastOptions={{
            style: {
              background: "#333",
              color: "#fff",
              borderRadius: "999px",
              padding: "12px 24px",
              fontSize: "14px",
            },
          }}
        />
      </body>
    </html>
  );
}
