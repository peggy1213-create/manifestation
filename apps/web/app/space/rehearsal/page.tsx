import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { ComingSoon, Screen } from '@/components/screen';
import { pageMetadata } from '@/lib/metadata';
import { routes } from '@/lib/navigation';

export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata('rehearsal', routes.rehearsal);
}

export default async function RehearsalPage() {
  const t = await getTranslations('pages.rehearsal');
  const common = await getTranslations('common');

  return (
    <Screen heading={t('heading')} intro={t('intro')}>
      <ComingSoon>{common('comingSoon')}</ComingSoon>
    </Screen>
  );
}
