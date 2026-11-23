import type { Metadata } from 'next';
import { Inter, Noto_Sans_TC } from 'next/font/google';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { SITE_NAME, SITE_URL } from '@/lib/site';
import './globals.css';

const notoSansTC = Noto_Sans_TC({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-noto-sans-tc',
  display: 'swap',
});

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_NAME,
    template: `%s · ${SITE_NAME}`,
  },
  description: '科學方法的顯化練習：WOOP、過程導向的顯化板，與 66 天足跡紀錄。',
  openGraph: {
    siteName: SITE_NAME,
    locale: 'zh_TW',
    type: 'website',
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // The config in i18n/request.ts is constant, so this does not opt any page
  // out of static rendering.
  const messages = await getMessages();

  return (
    <html lang="zh-TW">
      <body className={`${notoSansTC.variable} ${inter.variable}`}>
        <NextIntlClientProvider messages={messages}>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
