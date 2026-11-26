import Link from 'next/link';
import { getFormatter, getTranslations } from 'next-intl/server';
import { hasAction, ifThenParts, likelihoodAdvice, type Manifestation } from '@clearpath/core';
import { ReleaseDialog } from './release-dialog';
import { Sheet, StatusPill, quietButtonClassName, secondaryButtonClassName } from './ui';

/** The finished 顯化, read-only. Process steps come first — they are what gets repeated. */
export async function ManifestationView({ manifestation }: { manifestation: Manifestation }) {
  const t = await getTranslations('manifestation');
  const tRelease = await getTranslations('release');
  const tRoot = await getTranslations();
  const format = await getFormatter();

  const plan = ifThenParts(manifestation);
  const steps = manifestation.steps.filter(hasAction);
  const advice =
    manifestation.likelihood === null ? null : likelihoodAdvice(manifestation.likelihood);
  const released = manifestation.status === 'released';

  return (
    <main id="main" className="mx-auto w-full max-w-[34rem] px-4 pt-6 pb-16 sm:pt-10">
      <div className="flex items-center justify-between gap-3">
        <StatusPill>{t(`status.${manifestation.status}`)}</StatusPill>
        {released && manifestation.releasedAt ? (
          <p className="text-label text-ink/60">
            {tRelease('releasedOn', {
              date: format.dateTime(new Date(manifestation.releasedAt), { dateStyle: 'medium' }),
            })}
          </p>
        ) : null}
      </div>

      <h1 className="mt-3 text-display font-bold text-terracotta">
        {manifestation.wish || t('empty')}
      </h1>

      {released ? (
        <Sheet className="mt-5">
          <p className="text-body">{tRelease('done')}</p>
          {manifestation.releaseNote ? (
            <p className="mt-3 text-small text-ink/75">「{manifestation.releaseNote}」</p>
          ) : null}
        </Sheet>
      ) : null}

      <Sheet className="cp-margin-line mt-5 space-y-6">
        <section>
          <h2 className="text-label font-bold text-ink/70">{t('sections.process')}</h2>
          {steps.length > 0 ? (
            <ol className="mt-2 space-y-2">
              {steps.map((step, index) => (
                <li key={index} className="flex gap-3">
                  <span className="mt-2 h-2.5 w-2.5 shrink-0 rounded-full bg-terracotta" />
                  <span>
                    <span className="text-body">{step.action}</span>
                    {step.when || step.where ? (
                      <span className="block text-label text-ink/60">
                        {[step.when, step.where].filter(Boolean).join('·')}
                      </span>
                    ) : null}
                  </span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="mt-2 text-small text-ink/55">{t('empty')}</p>
          )}
        </section>

        <section>
          <h2 className="text-label font-bold text-ink/70">{t('sections.plan')}</h2>
          <p className="mt-2 text-body">
            {plan.complete ? (
              <span className="cp-highlight">
                {tRoot('builder.plan.previewSentence', {
                  ifPart: plan.ifPart,
                  thenPart: plan.thenPart,
                })}
              </span>
            ) : (
              <span className="text-ink/55">{t('empty')}</span>
            )}
          </p>
        </section>

        <section>
          <h2 className="text-label font-bold text-ink/70">{t('sections.obstacle')}</h2>
          <p className="mt-2 text-body whitespace-pre-line">
            {manifestation.obstacle || <span className="text-ink/55">{t('empty')}</span>}
          </p>
        </section>

        <section>
          <h2 className="text-label font-bold text-ink/70">{t('sections.outcome')}</h2>
          <p className="mt-2 text-body whitespace-pre-line">
            {manifestation.outcome || <span className="text-ink/55">{t('empty')}</span>}
          </p>
          {manifestation.outcomeSee || manifestation.outcomeHear || manifestation.outcomeFeel ? (
            <dl className="mt-3 space-y-1 text-small text-ink/75">
              {(
                [
                  ['outcome.seeLabel', manifestation.outcomeSee],
                  ['outcome.hearLabel', manifestation.outcomeHear],
                  ['outcome.feelLabel', manifestation.outcomeFeel],
                ] as const
              )
                .filter(([, value]) => value !== '')
                .map(([labelKey, value]) => (
                  <div key={labelKey} className="flex gap-2">
                    <dt className="font-bold">{tRoot(`builder.${labelKey}`)}</dt>
                    <dd>{value}</dd>
                  </div>
                ))}
            </dl>
          ) : null}
        </section>

        <section>
          <h2 className="text-label font-bold text-ink/70">{t('sections.likelihood')}</h2>
          <p className="mt-2 font-latin text-body">
            {manifestation.likelihood === null
              ? t('empty')
              : t('likelihoodValue', { value: manifestation.likelihood })}
          </p>
          {advice ? (
            <p className="mt-1 text-small text-ink/70">{tRoot(advice.messageKey)}</p>
          ) : null}
        </section>
      </Sheet>

      {!released ? (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <Link href={`/app/${manifestation.id}/edit`} className={secondaryButtonClassName}>
            {t('edit')}
          </Link>
          <ReleaseDialog manifestationId={manifestation.id} />
        </div>
      ) : (
        <p className="mt-6">
          <Link href="/app" className={quietButtonClassName}>
            {tRoot('list.title')}
          </Link>
        </p>
      )}
    </main>
  );
}
