import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { ComingSoon, Screen } from '@/components/screen';
import { pageMetadata } from '@/lib/metadata';
import { routes } from '@/lib/navigation';

export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata('login', routes.login);
}

export default async function LoginPage() {
  const t = await getTranslations('pages.login');
  const common = await getTranslations('common');

  return (
    <Screen heading={t('heading')} intro={t('intro')}>
      {/* The Google authorization-code + PKCE flow lands in P04. */}
      <ComingSoon>{common('comingSoon')}</ComingSoon>
      <p className="mt-6 max-w-prose text-[0.9375rem] text-ink-muted">{t('note')}</p>
    </Screen>
  );
}
