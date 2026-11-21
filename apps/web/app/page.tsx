import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { getSession } from '@/lib/auth/session';

export default async function Home() {
  const t = await getTranslations('home');
  const common = await getTranslations('common');
  const session = await getSession();

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-16 sm:py-24">
      <div className="cp-margin">
        <p className="cp-label">{common('appName')}</p>
        <h1 className="mt-2 text-3xl sm:text-4xl">
          <span className="cp-highlight">{t('heading')}</span>
        </h1>
        <p className="mt-6 max-w-prose">{t('body')}</p>
      </div>

      <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center">
        {session ? (
          <Link className="cp-button cp-button-primary" href="/app">
            {common('myPath')}
          </Link>
        ) : (
          <>
            <Link className="cp-button cp-button-primary" href="/login">
              {t('signIn')}
            </Link>
            <Link className="cp-button" href="/guest">
              {t('guest')}
            </Link>
          </>
        )}
      </div>
    </main>
  );
}
