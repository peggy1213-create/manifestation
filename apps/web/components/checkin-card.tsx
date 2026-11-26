'use client';

import { useEffect, useId, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  CHECKIN_STATUSES,
  NOTE_MAX_LENGTH,
  SUPPORT_LINE,
  mentionsSelfHarm,
  statusFromCues,
  type CheckinStatus,
  type DayKey,
  type ProcessStep,
} from '@clearpath/core';
import { PhotoField } from './photo-field';
import { formatDayWithWeekday } from '@/lib/format';

export interface CheckinDraft {
  status: CheckinStatus;
  note: string | null;
  cueStepIds: string[];
  /** A newly picked photo, already resized. */
  photo: Blob | null;
  /** The photo already stored for this day, kept unless it is removed. */
  photoKey: string | null;
}

export interface ExistingCheckin {
  status: CheckinStatus;
  note: string | null;
  cueStepIds: string[];
  photoKey: string | null;
  /** True while the day is still sitting in the offline outbox. */
  queued: boolean;
}

/**
 * 記下今天.
 *
 * The 今日行動 cues drive the status through the rule in packages/core: all
 * ticked is 做到了, some is 部分, none is 今天沒做到. Tapping a status directly
 * overrides it, and ticking a cue afterwards takes over again — last touch wins.
 */
export function CheckinCard({
  dayDate,
  cues,
  existing,
  photoUrl,
  pendingCount,
  message,
  onSubmit,
}: {
  dayDate: DayKey;
  cues: readonly ProcessStep[];
  existing: ExistingCheckin | null;
  photoUrl: string | null;
  pendingCount: number;
  message: { tone: 'quiet' | 'warm'; text: string } | null;
  onSubmit: (draft: CheckinDraft) => Promise<void>;
}) {
  const t = useTranslations('checkin');
  const noteFieldId = useId();

  const [ticked, setTicked] = useState<string[]>(existing?.cueStepIds ?? []);
  const [manualStatus, setManualStatus] = useState<CheckinStatus | null>(existing?.status ?? null);
  const [cuesTouched, setCuesTouched] = useState(false);
  const [note, setNote] = useState(existing?.note ?? '');
  const [photo, setPhoto] = useState<Blob | null>(null);
  const [photoKey, setPhotoKey] = useState<string | null>(existing?.photoKey ?? null);
  const [saving, setSaving] = useState(false);

  // Primitives, so the effect below reruns when the day's values change rather
  // than whenever the parent hands down a new object.
  const existingStatus = existing?.status ?? null;
  const existingNote = existing?.note ?? '';
  const existingPhotoKey = existing?.photoKey ?? null;
  const existingCueKey = existing?.cueStepIds.join(',') ?? '';

  // When a save or a sync brings the day back, the form picks its values up.
  useEffect(() => {
    setTicked(existingCueKey.length > 0 ? existingCueKey.split(',') : []);
    setManualStatus(existingStatus);
    setNote(existingNote);
    setPhotoKey(existingPhotoKey);
    setPhoto(null);
    setCuesTouched(false);
  }, [existingCueKey, existingNote, existingPhotoKey, existingStatus]);

  const derivedStatus = useMemo(
    () => statusFromCues({ totalCues: cues.length, tickedCues: ticked.length }),
    [cues.length, ticked.length],
  );

  const status: CheckinStatus | null = cuesTouched ? derivedStatus : manualStatus;

  const photoPreview = useMemo(() => {
    if (photo) return URL.createObjectURL(photo);
    return photoKey ? photoUrl : null;
  }, [photo, photoKey, photoUrl]);

  useEffect(() => {
    if (!photo || !photoPreview) return;
    return () => URL.revokeObjectURL(photoPreview);
  }, [photo, photoPreview]);

  function toggleCue(stepId: string) {
    setCuesTouched(true);
    setTicked((current) =>
      current.includes(stepId) ? current.filter((id) => id !== stepId) : [...current, stepId],
    );
  }

  function chooseStatus(next: CheckinStatus) {
    setCuesTouched(false);
    setManualStatus(next);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!status || saving) return;

    setSaving(true);
    try {
      await onSubmit({
        status,
        note: note.trim().length > 0 ? note : null,
        cueStepIds: ticked,
        photo,
        photoKey,
      });
      setPhoto(null);
    } finally {
      setSaving(false);
    }
  }

  const showSupport = mentionsSelfHarm(note);

  return (
    <section
      aria-labelledby="checkin-title"
      className="bg-paper-2 rounded-notebook-lg border-kraft/40 margin-line border p-5 sm:p-6"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h2 className="text-terracotta text-2xl font-bold" id="checkin-title">
          <span className="highlighter">{t('title')}</span>
        </h2>
        <p className="text-ink-soft text-[0.9375rem]">
          {t('todayIs', { date: formatDayWithWeekday(dayDate) })}
        </p>
      </div>

      {existing && !existing.queued ? (
        <p className="text-ink-soft mt-2 text-[0.9375rem]">{t('editingToday')}</p>
      ) : null}

      <form className="mt-5 space-y-6" onSubmit={handleSubmit}>
        {cues.length > 0 ? (
          <fieldset className="space-y-3">
            <legend className="font-bold">{t('cuesTitle')}</legend>
            <p className="text-ink-soft text-[0.8125rem] leading-snug">{t('cuesHint')}</p>
            <ul className="space-y-2" role="list">
              {cues.map((cue) => (
                <li key={cue.id}>
                  <label className="hover:bg-paper border-kraft/40 flex min-h-11 cursor-pointer items-center gap-3 rounded-notebook border bg-transparent px-3 py-2">
                    <input
                      checked={ticked.includes(cue.id)}
                      className="size-5 shrink-0 accent-[var(--cp-terracotta-strong)]"
                      onChange={() => toggleCue(cue.id)}
                      type="checkbox"
                    />
                    <span>{cue.body}</span>
                  </label>
                </li>
              ))}
            </ul>
          </fieldset>
        ) : (
          <p className="text-ink-soft text-[0.9375rem]">{t('cuesEmpty')}</p>
        )}

        <fieldset className="space-y-3">
          <legend className="font-bold">{t('statusQuestion')}</legend>
          <div className="flex flex-wrap gap-2">
            {CHECKIN_STATUSES.map((option) => {
              const selected = status === option;
              return (
                <button
                  aria-pressed={selected}
                  className="min-h-11 rounded-full border px-4 text-[0.9375rem]"
                  key={option}
                  onClick={() => chooseStatus(option)}
                  style={
                    selected
                      ? {
                          backgroundColor: 'var(--cp-terracotta-strong)',
                          borderColor: 'var(--cp-terracotta-strong)',
                          // White in light, ink in dark: white on the dark
                          // terracotta would read at 2.2:1.
                          color: 'var(--cp-on-terracotta)',
                        }
                      : { borderColor: 'var(--cp-kraft)' }
                  }
                  type="button"
                >
                  {t(`status.${option}`)}
                </button>
              );
            })}
          </div>
          {cues.length > 0 ? (
            <p className="text-ink-soft text-[0.8125rem] leading-snug">{t('statusHint')}</p>
          ) : null}
        </fieldset>

        <div className="space-y-2">
          <div className="flex flex-wrap items-baseline gap-x-2">
            <label className="font-bold" htmlFor={noteFieldId}>
              {t('noteLabel')}
            </label>
            <span className="text-ink-faint text-[0.8125rem]">{t('noteOptional')}</span>
          </div>
          <input
            className="border-kraft/60 bg-paper text-ink placeholder:text-ink-faint min-h-11 w-full rounded-notebook border px-3 py-2"
            id={noteFieldId}
            maxLength={NOTE_MAX_LENGTH}
            onChange={(event) => setNote(event.target.value)}
            placeholder={t('notePlaceholder')}
            type="text"
            value={note}
          />
          <p className="text-ink-faint text-right text-[0.8125rem] tabular-nums">
            {t('noteCounter', { count: note.length, max: NOTE_MAX_LENGTH })}
          </p>

          {showSupport ? (
            <p
              className="rounded-notebook border-honey bg-honey/25 text-ink border p-3 text-[0.9375rem] leading-relaxed"
              role="note"
            >
              {t('support.lead', { name: SUPPORT_LINE.name, number: SUPPORT_LINE.number })}{' '}
              <a className="text-terracotta-strong font-bold underline" href={SUPPORT_LINE.tel}>
                {t('support.call', { number: SUPPORT_LINE.number })}
              </a>
            </p>
          ) : null}
        </div>

        <PhotoField
          disabled={saving}
          onPick={(picked) => setPhoto(picked)}
          onRemove={() => {
            setPhoto(null);
            setPhotoKey(null);
          }}
          previewUrl={photoPreview}
        />

        <div className="space-y-2">
          <button
            className="min-h-11 w-full rounded-full px-5 font-bold disabled:opacity-60"
            disabled={!status || saving}
            style={{
              backgroundColor: 'var(--cp-terracotta-strong)',
              color: 'var(--cp-on-terracotta)',
            }}
            type="submit"
          >
            {saving ? t('saving') : existing ? t('saveAgain') : t('save')}
          </button>

          {!status ? (
            <p className="text-ink-soft text-center text-[0.8125rem]">{t('pickFirst')}</p>
          ) : null}

          {message ? (
            <p
              aria-live="polite"
              className={`text-center text-[0.9375rem] ${
                message.tone === 'warm' ? 'text-terracotta-strong' : 'text-ink-soft'
              }`}
            >
              {message.text}
            </p>
          ) : null}

          {pendingCount > 0 ? (
            <p aria-live="polite" className="text-ink-soft text-center text-[0.8125rem]">
              {t('pendingSync', { count: pendingCount })}
            </p>
          ) : null}
        </div>
      </form>
    </section>
  );
}
