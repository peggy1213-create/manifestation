import { getFormatter, getTranslations } from 'next-intl/server';
import { listManifestations } from '@clearpath/core';
import { getDatabase } from '@/lib/env';
import { requireSession } from '@/lib/auth/session';
import { GuestMove } from './guest-move';
import { SignOutButton } from './sign-out-button';

export const dynamic = 'force-dynamic';

export async function generateMetadata() {
  const t = await getTranslations('app');
  return { title: t('title') };
}

export default async function AppPage() {
  const session = await requireSession('/app');
  const t = await getTranslations('app');
  const woop = await getTranslations('app.woop');
  const format = await getFormatter();

  const manifestations = await listManifestations(getDatabase(), session.user.id);

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-10 sm:py-16">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="cp-margin">
          <h1 className="text-2xl">
            {session.user.name ? t('greeting', { name: session.user.name }) : t('greetingNoName')}
          </h1>
          <p className="cp-muted mt-2 text-sm">{t('signedInAs', { email: session.user.email })}</p>
        </div>
        <SignOutButton />
      </header>

      <GuestMove />

      <section className="mt-10">
        <h2 className="cp-label">{t('listHeading')}</h2>

        {manifestations.length === 0 ? (
          <p className="mt-3">{t('empty')}</p>
        ) : (
          <ul className="mt-3 flex flex-col gap-4">
            {manifestations.map((manifestation) => (
              <li key={manifestation.id} className="cp-sheet p-5">
                <h3 className="text-xl">
                  <span className="cp-highlight">{manifestation.wish}</span>
                </h3>
                <p className="cp-muted mt-2 text-sm">
                  {t('writtenOn', {
                    date: format.dateTime(new Date(manifestation.createdAt), { dateStyle: 'long' }),
                  })}
                  {manifestation.source === 'guest' ? ` · ${t('fromGuest')}` : ''}
                </p>

                <dl className="mt-4 flex flex-col gap-3">
                  {(
                    [
                      ['outcome', manifestation.outcome],
                      ['obstacle', manifestation.obstacle],
                      ['plan', manifestation.plan],
                    ] as const
                  )
                    .filter(([, value]) => value.length > 0)
                    .map(([field, value]) => (
                      <div key={field}>
                        <dt className="cp-label">{woop(field)}</dt>
                        <dd className="mt-1">{value}</dd>
                      </div>
                    ))}
                </dl>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="cp-muted mt-10 text-sm">{t('nextPhase')}</p>
    </main>
  );
}
