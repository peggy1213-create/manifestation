import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import {
  CYCLE_DAYS,
  compareDayKeys,
  dayNumber,
  listManifestations,
  today as todayIn,
} from '@clearpath/core';
import { getDatabase } from '@/lib/cloudflare';
import { currentUser } from '@/lib/session';
import { formatDay } from '@/lib/format';
import { SignOutButton } from '@/components/sign-out-button';

/** The 顯化 this person is walking, each one a way into its 66-day path. */
export default async function ManifestationListPage() {
  const t = await getTranslations('list');
  const user = await currentUser();
  if (!user) redirect('/sign-in?returnTo=%2Fapp');

  const db = await getDatabase();
  const manifestations = await listManifestations(db, user.id);

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6 sm:py-12">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="text-terracotta text-[2rem] leading-tight font-bold">{t('title')}</h1>
        <SignOutButton />
      </div>

      {manifestations.length === 0 ? (
        <p className="text-ink-soft mt-6">{t('empty')}</p>
      ) : (
        <ul className="mt-6 space-y-3" role="list">
          {manifestations.map((manifestation) => {
            const today = todayIn(manifestation.timeZone);
            const day = dayNumber(manifestation.startedOn, today);
            const label =
              compareDayKeys(today, manifestation.startedOn) < 0
                ? t('notStarted', { date: formatDay(manifestation.startedOn) })
                : day > CYCLE_DAYS
                  ? t('finished')
                  : t('dayOf', { day, total: CYCLE_DAYS });

            return (
              <li key={manifestation.id}>
                <Link
                  className="bg-paper-2 rounded-notebook border-kraft/40 margin-line hover:border-kraft block border p-4"
                  href={`/app/${manifestation.id}`}
                >
                  <p className="text-ink-soft text-[0.8125rem] tabular-nums">{label}</p>
                  <p className="mt-1 text-xl font-bold">{manifestation.wish}</p>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
