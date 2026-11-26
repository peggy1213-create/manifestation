import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { safeReturnTo } from '@clearpath/auth';
import { currentUser } from '@/lib/session';

const ERRORS = ['cancelled', 'expired', 'refused', 'not_configured'] as const;
type SignInError = (typeof ERRORS)[number];

function asError(value: string | undefined): SignInError | null {
  return ERRORS.includes(value as SignInError) ? (value as SignInError) : null;
}

/**
 * The only way into Clear Path on the web. Google is the single sign-in; the
 * button simply starts the flow in /api/auth/google/start.
 */
export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; returnTo?: string }>;
}) {
  const t = await getTranslations('auth');
  const { error, returnTo } = await searchParams;

  const destination = safeReturnTo(returnTo);
  if (await currentUser()) redirect(destination);

  const startUrl = `/api/auth/google/start?returnTo=${encodeURIComponent(destination)}`;
  const message = asError(error);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-4 py-12 sm:px-6">
      <div className="bg-paper-2 rounded-notebook-lg border-kraft/40 margin-line border p-6">
        <h1 className="text-terracotta text-2xl font-bold">
          <span className="highlighter">{t('signInTitle')}</span>
        </h1>
        <p className="mt-3">{t('signInBody')}</p>

        {message ? (
          <p
            className="rounded-notebook border-honey bg-honey/25 text-ink mt-4 border p-3 text-[0.9375rem]"
            role="status"
          >
            {t(`errors.${message}`)}
          </p>
        ) : null}

        <a
          className="mt-6 flex min-h-11 w-full items-center justify-center rounded-full px-5 font-bold"
          href={startUrl}
          style={{
            backgroundColor: 'var(--cp-terracotta-strong)',
            color: 'var(--cp-on-terracotta)',
          }}
        >
          {t('signInWithGoogle')}
        </a>

        <p className="text-ink-soft mt-4 text-[0.8125rem] leading-snug">{t('privacy')}</p>
      </div>
    </main>
  );
}
