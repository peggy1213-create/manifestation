'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import type { GuestDraft } from '@clearpath/core/guest';
import { clearGuestDraft, readGuestDraft } from '@/lib/guest-storage';
import type { GuestImportResponse } from '@/app/api/guest/import/route';

type Status =
  | 'idle'
  | 'moving'
  | 'moved'
  | 'already-in-account'
  | 'account-not-empty'
  | 'discarded'
  | 'failed';

/**
 * After sign-in: offers to move the 顯化 written in guest mode into the
 * account. The draft itself only ever leaves this device if the person says so.
 */
export function GuestMove() {
  const t = useTranslations('guestMove');
  const router = useRouter();
  const [draft, setDraft] = useState<GuestDraft | null>(null);
  const [status, setStatus] = useState<Status>('idle');

  useEffect(() => {
    setDraft(readGuestDraft());
  }, []);

  if (!draft && status === 'idle') return null;

  async function move() {
    if (!draft) return;
    setStatus('moving');

    try {
      const response = await fetch('/api/guest/import', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ draft }),
      });
      if (!response.ok) {
        setStatus('failed');
        return;
      }

      const result = (await response.json()) as GuestImportResponse;
      if (result.outcome === 'account-not-empty') {
        // The account keeps its own 顯化; the draft stays on this device.
        setStatus('account-not-empty');
        return;
      }

      clearGuestDraft();
      setDraft(null);
      setStatus(result.outcome === 'already-in-account' ? 'already-in-account' : 'moved');
      router.refresh();
    } catch {
      setStatus('failed');
    }
  }

  function discard() {
    clearGuestDraft();
    setDraft(null);
    setStatus('discarded');
  }

  const settled = status === 'moved' || status === 'already-in-account' || status === 'discarded';

  return (
    <section className="cp-sheet mt-8 p-5" aria-live="polite">
      {settled ? (
        <p>
          {t(
            status === 'moved'
              ? 'moved'
              : status === 'already-in-account'
                ? 'alreadyInAccount'
                : 'discarded',
          )}
        </p>
      ) : (
        <>
          <h2 className="text-lg">{t('heading')}</h2>
          {draft ? <p className="mt-2">{t('body', { wish: draft.wish })}</p> : null}

          {status === 'account-not-empty' ? <p className="mt-2">{t('accountNotEmpty')}</p> : null}
          {status === 'failed' ? <p className="mt-2">{t('failed')}</p> : null}

          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <button
              className="cp-button cp-button-primary"
              type="button"
              onClick={move}
              disabled={status === 'moving' || status === 'account-not-empty'}
            >
              {status === 'moving' ? t('moving') : t('move')}
            </button>
            <button className="cp-button" type="button" onClick={discard}>
              {t('discard')}
            </button>
          </div>
        </>
      )}
    </section>
  );
}
