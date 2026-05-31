import type { Metadata, Viewport } from "next";
import "./globals.css";
import Providers from "@/components/Providers";
import Header from "@/components/layout/Header";
import Navigation from "@/components/layout/Navigation";

export const metadata: Metadata = {
  title: "OOTD — 오늘의 착장 기록",
  description: "착장 사진 한 장으로 나만의 손글씨 패션 카드를 만들어보세요.",
  openGraph: {
    title: "OOTD — 오늘의 착장 기록",
    description: "착장 사진 한 장으로 나만의 손글씨 패션 카드를 만들어보세요.",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="h-full">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        {/* eslint-disable-next-line @next/next/no-page-custom-font -- App Router layout.tsx는 pages/_document.js와 다름, Nanum Pen Script는 next/font 미지원 */}
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@300;400;500;700&family=Nanum+Pen+Script&family=Montserrat:wght@400;600;700&family=Inter:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
        {/* eslint-disable-next-line @next/next/no-page-custom-font -- Material Symbols는 next/font 미지원 */}
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full flex flex-col antialiased bg-[#fdf8f8] pb-24">
        <Providers>
          <Header />
          {children}
          <Navigation />
        </Providers>
      </body>
    </html>
  );
}
