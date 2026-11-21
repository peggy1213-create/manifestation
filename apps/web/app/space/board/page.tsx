import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { ComingSoon, Screen } from '@/components/screen';
import { pageMetadata } from '@/lib/metadata';
import { routes } from '@/lib/navigation';

export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata('board', routes.board);
}

export default async function BoardPage() {
  const t = await getTranslations('pages.board');
  const common = await getTranslations('common');

  return (
    <Screen heading={t('heading')} intro={t('intro')}>
      <ComingSoon>{common('comingSoon')}</ComingSoon>
    </Screen>
  );
}
