import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { getLocale, getTranslations } from 'next-intl/server';
import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';
import './globals.css';

// Inter is self-hosted for Latin and numbers.
//
// 繁體中文 is set in Noto Sans TC when the reader already has it, then PingFang TC
// (iOS/macOS) or Microsoft JhengHei (Windows) — see --font-sans in globals.css.
// Serving Noto Sans TC ourselves is not worth it: the page's Chinese text spans
// ~14 unicode-range subsets, which costs about 900 KiB plus a 70 KiB render-blocking
// stylesheet, and user-written notes would pull down more again.
const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
  display: 'swap',
});

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('site');
  return {
    title: t('name'),
    description: t('description'),
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const t = await getTranslations('site');

  return (
    <html lang={locale} className={inter.variable}>
      <body className="bg-paper text-ink">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-notebook focus:bg-ink focus:px-4 focus:py-3 focus:text-paper"
        >
          {t('skipToContent')}
        </a>
        <SiteHeader />
        <main id="main">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
