import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BananaCut - Q版拼图切割工具",
  description: "将排列整齐的 Q 版拼图/表情包切分为独立的单图，支持补全正方形后打包下载",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
