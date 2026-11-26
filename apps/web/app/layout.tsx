import type { Metadata } from 'next';
import { Inter, Noto_Sans_TC } from 'next/font/google';
import './globals.css';

// Noto Sans TC for 繁體中文, Inter for Latin text and numbers.
// CJK families are far too large to preload, so they are fetched on demand.
const notoSansTC = Noto_Sans_TC({
  variable: '--font-noto-sans-tc',
  weight: ['400', '700'],
  display: 'swap',
  preload: false,
});

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: '顯化 Clear Path',
  description: '科學方法的顯化練習：WOOP、過程導向的顯化板，與 66 天足跡紀錄。',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-TW">
      <body className={`${notoSansTC.variable} ${inter.variable} antialiased`}>{children}</body>
    </html>
  );
}
