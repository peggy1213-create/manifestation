'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import {
  GUEST_FIELD_MAX_LENGTH,
  GUEST_WISH_MAX_LENGTH,
  parseGuestDraft,
} from '@clearpath/core/guest';
import { clearGuestDraft, readGuestDraft, writeGuestDraft } from '@/lib/guest-storage';

type Notice = 'none' | 'saved' | 'needWish' | 'storageFailed' | 'cleared';

const emptyFields = { wish: '', outcome: '', obstacle: '', plan: '' };

export function GuestDraftForm() {
  const t = useTranslations('guest');
  const [fields, setFields] = useState(emptyFields);
  const [createdAt, setCreatedAt] = useState<number | null>(null);
  const [notice, setNotice] = useState<Notice>('none');

  useEffect(() => {
    const draft = readGuestDraft();
    if (!draft) return;
    setFields({
      wish: draft.wish,
      outcome: draft.outcome,
      obstacle: draft.obstacle,
      plan: draft.plan,
    });
    setCreatedAt(draft.createdAt);
  }, []);

  function update(field: keyof typeof emptyFields, value: string) {
    setFields((current) => ({ ...current, [field]: value }));
    setNotice('none');
  }

  function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    // The same parser the server uses, so a draft that saves here is a draft
    // that can move later.
    const draft = parseGuestDraft({ ...fields, createdAt: createdAt ?? Date.now() });
    if (!draft) {
      setNotice('needWish');
      return;
    }

    if (!writeGuestDraft(draft)) {
      setNotice('storageFailed');
      return;
    }

    setCreatedAt(draft.createdAt);
    setNotice('saved');
  }

  function clear() {
    clearGuestDraft();
    setFields(emptyFields);
    setCreatedAt(null);
    setNotice('cleared');
  }

  return (
    <form className="cp-sheet mt-8 flex flex-col gap-5 p-5 sm:p-6" onSubmit={save}>
      <div>
        <label className="cp-label" htmlFor="guest-wish">
          {t('wishLabel')}
        </label>
        <input
          id="guest-wish"
          className="cp-field mt-2"
          value={fields.wish}
          maxLength={GUEST_WISH_MAX_LENGTH}
          placeholder={t('wishPlaceholder')}
          onChange={(event) => update('wish', event.target.value)}
        />
      </div>

      <div>
        <label className="cp-label" htmlFor="guest-outcome">
          {t('outcomeLabel')}
        </label>
        <textarea
          id="guest-outcome"
          className="cp-field mt-2"
          rows={3}
          value={fields.outcome}
          maxLength={GUEST_FIELD_MAX_LENGTH}
          placeholder={t('outcomePlaceholder')}
          onChange={(event) => update('outcome', event.target.value)}
        />
        <p className="cp-muted mt-2 text-sm">{t('obstacleHint')}</p>
      </div>

      <div>
        <label className="cp-label" htmlFor="guest-obstacle">
          {t('obstacleLabel')}
        </label>
        <textarea
          id="guest-obstacle"
          className="cp-field mt-2"
          rows={3}
          value={fields.obstacle}
          maxLength={GUEST_FIELD_MAX_LENGTH}
          placeholder={t('obstaclePlaceholder')}
          onChange={(event) => update('obstacle', event.target.value)}
        />
      </div>

      <div>
        <label className="cp-label" htmlFor="guest-plan">
          {t('planLabel')}
        </label>
        <textarea
          id="guest-plan"
          className="cp-field mt-2"
          rows={3}
          value={fields.plan}
          maxLength={GUEST_FIELD_MAX_LENGTH}
          placeholder={t('planPlaceholder')}
          onChange={(event) => update('plan', event.target.value)}
        />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <button className="cp-button cp-button-primary" type="submit">
          {t('save')}
        </button>
        <button className="cp-button" type="button" onClick={clear}>
          {t('clear')}
        </button>
      </div>

      <p aria-live="polite" className="text-sm">
        {notice === 'none' ? null : t(notice === 'needWish' ? 'needWish' : notice)}
      </p>

      {createdAt === null ? null : (
        <p className="text-sm">
          <Link className="cp-link" href="/login?returnTo=%2Fapp">
            {t('signInToMove')}
          </Link>
        </p>
      )}
    </form>
  );
}
