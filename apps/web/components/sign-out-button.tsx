import { useTranslations } from 'next-intl';

/**
 * Signing out is a POST, so it carries an Origin for the route to check and
 * cannot be triggered by a link someone else wrote.
 */
export function SignOutButton() {
  const t = useTranslations('auth');

  return (
    <form action="/api/auth/sign-out" method="post">
      <button
        className="text-ink-soft hover:text-ink inline-flex min-h-11 items-center px-2 text-[0.9375rem] underline"
        type="submit"
      >
        {t('signOut')}
      </button>
    </form>
  );
}
