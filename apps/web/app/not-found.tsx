import type { Metadata } from 'next';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { Screen } from '@/components/screen';
import { pageMetadata } from '@/lib/metadata';
import { routes } from '@/lib/navigation';

export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata('notFound', routes.home);
}

export default async function NotFound() {
  const t = await getTranslations('pages.notFound');
  const common = await getTranslations('common');

  return (
    <Screen heading={t('heading')} intro={t('intro')}>
      <p className="mt-6">
        <Link
          href={routes.home}
          className="inline-flex min-h-11 items-center font-bold text-blue-ink underline underline-offset-4"
        >
          {common('backHome')}
        </Link>
      </p>
    </Screen>
  );
}
