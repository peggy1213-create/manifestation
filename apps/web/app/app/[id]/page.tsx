import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import {
  CYCLE_DAYS,
  compareDayKeys,
  dayNumber,
  findManifestation,
  listCheckins,
  listCompletedRehearsalDays,
  listProcessSteps,
  selectDailyCues,
  today as todayIn,
} from '@clearpath/core';
import { PathBoard, type BoardCheckin } from '@/components/path-board';
import { getDatabase } from '@/lib/cloudflare';
import { currentUser } from '@/lib/session';
import { formatDay } from '@/lib/format';

/**
 * One 顯化 on its 66-day path: 記下今天, today's 今日行動 cues, the 足跡 map and
 * the cycle stats.
 *
 * Reads go through packages/core/repo with the signed-in user's id, so the page
 * can only ever render that person's own 顯化.
 */
export default async function ManifestationPage({ params }: { params: Promise<{ id: string }> }) {
  const t = await getTranslations('path');
  const user = await currentUser();

  const { id } = await params;

  if (!user) {
    redirect(`/sign-in?returnTo=${encodeURIComponent(`/app/${id}`)}`);
  }

  const db = await getDatabase();
  const manifestation = await findManifestation(db, user.id, id);

  if (!manifestation) {
    return <Notice body={t('notFoundBody')} title={t('notFoundTitle')} />;
  }

  const [steps, checkins, rehearsalDays] = await Promise.all([
    listProcessSteps(db, user.id, manifestation.id),
    listCheckins(db, user.id, manifestation.id),
    listCompletedRehearsalDays(db, user.id, manifestation.id),
  ]);

  // "Today" is the day the person is living in, not UTC.
  const today = todayIn(manifestation.timeZone);
  const day = dayNumber(manifestation.startedOn, today);

  const cues = selectDailyCues(steps, day);
  const boardCheckins: BoardCheckin[] = checkins.map((checkin) => ({
    dayDate: checkin.dayDate,
    status: checkin.status,
    note: checkin.note,
    photoKey: checkin.photoKey,
    cueStepIds: checkin.cueStepIds,
  }));

  const beforeStart = compareDayKeys(today, manifestation.startedOn) < 0;
  const afterEnd = day > CYCLE_DAYS;

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6 sm:py-12">
      <header className="space-y-3">
        <p className="text-ink-soft text-[0.9375rem] tabular-nums">
          {beforeStart
            ? t('beforeStart', { date: formatDay(manifestation.startedOn) })
            : afterEnd
              ? t('afterEnd', { total: CYCLE_DAYS })
              : t('dayOf', { day, total: CYCLE_DAYS })}
        </p>
        <h1 className="text-terracotta text-[2rem] leading-tight font-bold">
          {manifestation.wish}
        </h1>
      </header>

      {/* Process first: the outcome is one line, the obstacle and the
          if-then plan get the space, and they always follow it. */}
      <section
        aria-labelledby="woop-title"
        className="bg-paper-2 rounded-notebook-lg border-kraft/40 mt-6 space-y-4 border p-5"
      >
        <h2 className="sr-only" id="woop-title">
          {t('planLabel')}
        </h2>

        <div>
          <p className="text-ink-soft text-[0.8125rem]">{t('outcomeLabel')}</p>
          <p className="mt-1">{manifestation.outcome}</p>
        </div>

        <div>
          <p className="text-ink-soft text-[0.8125rem]">{t('obstacleLabel')}</p>
          <p className="mt-1">{manifestation.obstacle}</p>
        </div>

        <div className="border-kraft/40 border-t pt-4">
          <p className="text-ink-soft text-[0.8125rem]">{t('planLabel')}</p>
          <p className="mt-1 font-bold">
            {t('planSentence', {
              planIf: manifestation.planIf,
              planThen: manifestation.planThen,
            })}
          </p>
        </div>
      </section>

      <div className="mt-8">
        <PathBoard
          checkins={boardCheckins}
          cues={cues}
          manifestationId={manifestation.id}
          rehearsalDays={rehearsalDays}
          startedOn={manifestation.startedOn}
          today={today}
        />
      </div>
    </main>
  );
}

function Notice({ title, body }: { title: string; body: string }) {
  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-16 sm:px-6">
      <h1 className="text-terracotta text-2xl font-bold">{title}</h1>
      <p className="text-ink-soft mt-3">{body}</p>
    </main>
  );
}
