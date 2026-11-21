import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { safeReturnTo } from '@clearpath/auth';
import { getSession } from '@/lib/auth/session';

export async function generateMetadata() {
  const t = await getTranslations('login');
  return { title: t('title') };
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string }>;
}) {
  const t = await getTranslations('login');
  const { returnTo } = await searchParams;
  const destination = safeReturnTo(returnTo);

  const session = await getSession();
  if (session) redirect(destination);

  const signInHref = `/auth/google?returnTo=${encodeURIComponent(destination)}`;

  return (
    <main className="mx-auto w-full max-w-md px-4 py-16 sm:py-24">
      <div className="cp-sheet p-6 sm:p-8">
        <h1 className="text-2xl">{t('heading')}</h1>
        <p className="mt-4">{t('body')}</p>

        {/* GET /auth/google starts the PKCE flow and redirects to Google. */}
        <a className="cp-button cp-button-primary mt-8 w-full" href={signInHref} rel="nofollow">
          {t('googleButton')}
        </a>

        <p className="cp-muted mt-4 text-sm">{t('scopeNote')}</p>
        <p className="cp-muted mt-2 text-sm">{t('privacyNote')}</p>

        <hr className="my-6 border-0 border-t" style={{ borderColor: 'var(--cp-rule)' }} />

        <p className="text-sm">
          {t('guestNote')}{' '}
          <Link className="cp-link" href="/guest">
            {t('guestLink')}
          </Link>
        </p>
      </div>
    </main>
  );
}
