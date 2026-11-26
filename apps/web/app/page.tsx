import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { currentUser } from '@/lib/session';

export default async function Home() {
  const t = await getTranslations('home');

  // Someone already signed in has no use for a front door.
  if (await currentUser()) redirect('/app');

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-4 py-12 sm:px-6">
      <h1 className="text-terracotta text-[2rem] leading-tight font-bold">
        <span className="highlighter">{t('tagline')}</span>
      </h1>
      <p className="mt-4">{t('lead')}</p>

      <Link
        className="mt-8 flex min-h-11 w-full items-center justify-center rounded-full px-5 font-bold"
        href="/sign-in"
        style={{ backgroundColor: 'var(--cp-terracotta-strong)', color: 'var(--cp-on-terracotta)' }}
      >
        {t('start')}
      </Link>
    </main>
  );
}
