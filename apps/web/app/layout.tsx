import type { Metadata, Viewport } from 'next';
import { Inter, Noto_Sans_TC } from 'next/font/google';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getTranslations } from 'next-intl/server';
import './globals.css';

const notoSansTC = Noto_Sans_TC({
  variable: '--font-noto-sans-tc',
  subsets: ['latin'],
  weight: ['400', '700'],
  display: 'swap',
});

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
  display: 'swap',
});

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('app');
  return { title: `${t('name')} Clear Path`, description: t('tagline') };
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#FBF4EA' },
    { media: '(prefers-color-scheme: dark)', color: '#17110C' },
  ],
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const messages = await getMessages();
  const t = await getTranslations('common');

  return (
    <html lang="zh-TW">
      <body className={`${notoSansTC.variable} ${inter.variable} antialiased`}>
        <NextIntlClientProvider messages={messages}>
          <a
            href="#main"
            className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-paper focus:px-4 focus:py-2"
          >
            {t('skipToContent')}
          </a>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
