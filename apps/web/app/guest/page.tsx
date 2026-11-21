import { getTranslations } from 'next-intl/server';
import { GuestDraftForm } from './guest-draft-form';

export async function generateMetadata() {
  const t = await getTranslations('guest');
  return { title: t('title') };
}

/**
 * Guest mode: one 顯化, written straight into this browser's localStorage.
 * Nothing is sent anywhere until someone signs in and chooses to move it.
 */
export default async function GuestPage() {
  const t = await getTranslations('guest');

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-10 sm:py-16">
      <div className="cp-margin">
        <h1 className="text-2xl">
          <span className="cp-highlight">{t('heading')}</span>
        </h1>
        <p className="mt-4">{t('body')}</p>
      </div>

      <GuestDraftForm />
    </main>
  );
}
