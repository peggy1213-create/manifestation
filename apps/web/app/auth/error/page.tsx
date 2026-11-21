import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { isAuthErrorReason } from '@/lib/auth/errors';

export async function generateMetadata() {
  const t = await getTranslations('authError');
  return { title: t('title') };
}

export default async function AuthErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string }>;
}) {
  const t = await getTranslations('authError');
  const { reason } = await searchParams;
  const key = isAuthErrorReason(reason) ? reason : 'unknown';

  return (
    <main className="mx-auto w-full max-w-md px-4 py-16 sm:py-24">
      <div className="cp-sheet p-6 sm:p-8">
        <h1 className="text-2xl">{t('heading')}</h1>
        <p className="mt-4">{t(`reason.${key}`)}</p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link className="cp-button cp-button-primary" href="/login">
            {t('retry')}
          </Link>
          <Link className="cp-button" href="/">
            {t('home')}
          </Link>
        </div>
      </div>
    </main>
  );
}
