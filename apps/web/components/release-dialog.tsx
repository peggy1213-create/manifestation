'use client';

import { useId, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { RELEASE_NOTE_MAX_LENGTH, characterCount } from '@clearpath/core';
import { releaseAction } from '@/app/actions/manifestations';
import {
  inputClassName,
  primaryButtonClassName,
  quietButtonClassName,
  secondaryButtonClassName,
} from './ui';

/**
 * 放下 (release). Letting go is offered as a kind, ordinary choice — no warning colours,
 * no talk of giving up, and the 顯化 stays in the person's 足跡.
 */
export function ReleaseDialog({ manifestationId }: { manifestationId: string }) {
  const t = useTranslations('release');
  const tErrors = useTranslations('errors');
  const router = useRouter();
  const noteId = useId();
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const tooLong = characterCount(note.trim()) > RELEASE_NOTE_MAX_LENGTH;

  function confirm() {
    setError(null);
    startTransition(async () => {
      const result = await releaseAction(manifestationId, note);
      if (result.ok) {
        setOpen(false);
        router.push(`/app/${manifestationId}`);
        router.refresh();
        return;
      }
      setError(
        result.error === 'released' || result.error === 'notFound'
          ? tErrors(result.error)
          : tErrors('generic'),
      );
    });
  }

  if (!open) {
    return (
      <button type="button" className={quietButtonClassName} onClick={() => setOpen(true)}>
        {t('action')}
      </button>
    );
  }

  return (
    <section
      aria-labelledby={`${noteId}-title`}
      className="mt-4 rounded-md border border-kraft/70 bg-paper-2/60 p-4"
    >
      <h2 id={`${noteId}-title`} className="text-heading font-bold">
        {t('title')}
      </h2>
      <p className="mt-1 text-small text-ink/80">{t('body')}</p>

      <label htmlFor={noteId} className="mt-4 block text-label font-bold text-ink/80">
        {t('noteLabel')}
      </label>
      <textarea
        id={noteId}
        className={inputClassName}
        rows={3}
        value={note}
        placeholder={t('notePlaceholder')}
        onChange={(event) => setNote(event.target.value)}
      />
      {tooLong ? (
        <p className="mt-1 text-small text-terracotta-strong">
          {tErrors('tooLong', { limit: RELEASE_NOTE_MAX_LENGTH })}
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="mt-1 text-small text-terracotta-strong">
          {error}
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          className={primaryButtonClassName}
          onClick={confirm}
          disabled={pending || tooLong}
        >
          {t('confirm')}
        </button>
        <button
          type="button"
          className={secondaryButtonClassName}
          onClick={() => setOpen(false)}
          disabled={pending}
        >
          {t('cancel')}
        </button>
      </div>
    </section>
  );
}
