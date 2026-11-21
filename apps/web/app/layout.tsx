import type { Metadata } from 'next';
import localFont from 'next/font/local';
import './globals.css';

// Self-hosted (see app/fonts/NOTICE.md) rather than next/font/google. Inter sits first in
// the font stack (apps/web/app/globals.css) so Latin letters and numerals render in Inter;
// Noto Sans TC covers the Chinese glyphs Inter lacks.
const inter = localFont({
  src: './fonts/inter-latin-variable.woff2',
  weight: '400 700',
  variable: '--font-inter',
  display: 'swap',
});

const notoSansTC = localFont({
  src: [
    { path: './fonts/noto-sans-tc-400.woff2', weight: '400', style: 'normal' },
    { path: './fonts/noto-sans-tc-700.woff2', weight: '700', style: 'normal' },
  ],
  variable: '--font-noto-sans-tc',
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
    // The font variables go on <html> so `--font-sans` in globals.css can reach them.
    <html lang="zh-TW" className={`${inter.variable} ${notoSansTC.variable}`}>
      <body className="antialiased">{children}</body>
    </html>
  );
}
