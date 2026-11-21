import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { Screen } from '@/components/screen';
import { pageMetadata } from '@/lib/metadata';
import { routes } from '@/lib/navigation';

export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata('about', routes.about);
}

export default async function AboutPage() {
  const t = await getTranslations('pages.about');

  return (
    <Screen heading={t('heading')} intro={t('intro')}>
      <p className="mt-6 max-w-prose text-ink">{t('body')}</p>
    </Screen>
  );
}
