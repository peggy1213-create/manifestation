import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { Screen } from '@/components/screen';
import { pageMetadata } from '@/lib/metadata';
import { routes } from '@/lib/navigation';

export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata('contact', routes.contact);
}

export default async function ContactPage() {
  const t = await getTranslations('pages.contact');
  const email = t('email');

  return (
    <Screen heading={t('heading')} intro={t('intro')}>
      <p className="mt-6">
        <a
          href={`mailto:${email}`}
          className="inline-flex min-h-11 items-center font-bold text-blue-ink underline underline-offset-4"
        >
          {email}
        </a>
      </p>
    </Screen>
  );
}
