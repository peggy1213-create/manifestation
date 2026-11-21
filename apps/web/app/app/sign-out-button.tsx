import { getTranslations } from 'next-intl/server';

/** POST, so sign-out passes the origin check in middleware. */
export async function SignOutButton() {
  const t = await getTranslations('common');

  return (
    <form action="/auth/logout" method="post">
      <button className="cp-button" type="submit">
        {t('signOut')}
      </button>
    </form>
  );
}
