import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { ComingSoon, Screen } from '@/components/screen';
import { pageMetadata } from '@/lib/metadata';
import { routes } from '@/lib/navigation';

export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata('manifestations', routes.manifestations);
}

export default async function ManifestationsPage() {
  const t = await getTranslations('pages.manifestations');
  const common = await getTranslations('common');

  return (
    <Screen heading={t('heading')} intro={t('intro')}>
      <ComingSoon>{common('comingSoon')}</ComingSoon>
    </Screen>
  );
}
