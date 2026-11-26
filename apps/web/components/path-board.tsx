'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  buildPathMap,
  cycleStats,
  newId,
  type CheckinStatus,
  type DayKey,
  type ProcessStep,
} from '@clearpath/core';
import { CheckinCard, type CheckinDraft, type ExistingCheckin } from './checkin-card';
import { CycleStatsPanel } from './cycle-stats';
import { Footprints } from './footprints';
import { listQueued, outboxSupported, queueCheckin, type OutboxEntry } from '@/lib/outbox';
import { flushOutbox, sendEntry, type FlushResult } from '@/lib/sync';

export interface BoardCheckin {
  dayDate: DayKey;
  status: CheckinStatus;
  note: string | null;
  photoKey: string | null;
  cueStepIds: string[];
}

interface LocalCheckin extends BoardCheckin {
  /** Still in the outbox, waiting for a network. */
  queued: boolean;
}

/**
 * Holds the day's record on the client so 足跡 and the cycle stats move the
 * moment 記下今天 is saved, online or not. The server render is the base; a
 * locally queued day sits on top of it until the server has the same day.
 */
export function PathBoard({
  manifestationId,
  startedOn,
  today,
  cues,
  checkins,
  rehearsalDays,
}: {
  manifestationId: string;
  startedOn: DayKey;
  today: DayKey;
  cues: readonly ProcessStep[];
  checkins: readonly BoardCheckin[];
  rehearsalDays: readonly DayKey[];
}) {
  const t = useTranslations('checkin');
  const tErrors = useTranslations('errors');
  const router = useRouter();

  const [overlay, setOverlay] = useState<Record<DayKey, LocalCheckin>>({});
  const [pendingCount, setPendingCount] = useState(0);
  const [message, setMessage] = useState<{ tone: 'quiet' | 'warm'; text: string } | null>(null);

  /** Takes a day back off the board when nothing was stored for it anywhere. */
  const clearOverlayDay = useCallback((day: DayKey) => {
    setOverlay((current) => {
      if (!(day in current)) return current;
      const next = { ...current };
      delete next[day];
      return next;
    });
  }, []);

  const applyOutbox = useCallback((entries: readonly OutboxEntry[]) => {
    setPendingCount(entries.length);
    if (entries.length === 0) return;

    setOverlay((current) => {
      const next = { ...current };
      for (const entry of entries) {
        next[entry.dayDate] = {
          dayDate: entry.dayDate,
          status: entry.status,
          note: entry.note,
          photoKey: entry.photoKey ?? null,
          cueStepIds: entry.cueStepIds,
          queued: true,
        };
      }
      return next;
    });
  }, []);

  /** Drains the outbox and reports what happened; the caller words it. */
  const sync = useCallback(async (): Promise<FlushResult | null> => {
    if (!outboxSupported()) return null;

    const queued = await listQueued(manifestationId);
    if (queued.length === 0) {
      setPendingCount(0);
      return null;
    }

    const result = await flushOutbox(manifestationId);
    setPendingCount(result.kept.length);

    if (result.synced.length > 0) {
      setOverlay((current) => {
        const next = { ...current };
        for (const { entry } of result.synced) {
          const local = next[entry.dayDate];
          if (local) next[entry.dayDate] = { ...local, queued: false };
        }
        return next;
      });
      router.refresh();
    }

    return result;
  }, [manifestationId, router]);

  /** A background drain speaks up only when something is still waiting. */
  const syncQuietly = useCallback(async () => {
    const result = await sync();
    if (!result) return;
    if (result.refused.length > 0) {
      setMessage({ tone: 'warm', text: tErrors('saveFailed') });
    } else if (result.kept.length > 0) {
      setMessage({ tone: 'warm', text: t('syncFailed') });
    }
  }, [sync, t, tErrors]);

  // A day queued before the tab closed is still a day: show it, then try again.
  useEffect(() => {
    if (!outboxSupported()) return;
    let cancelled = false;

    void (async () => {
      try {
        const entries = await listQueued(manifestationId);
        if (cancelled) return;
        applyOutbox(entries);
        if (entries.length > 0) await syncQuietly();
      } catch {
        // No outbox available (private browsing, blocked storage): the direct
        // send path below still works.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [applyOutbox, manifestationId, syncQuietly]);

  useEffect(() => {
    function handleOnline() {
      void syncQuietly();
    }
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [syncQuietly]);

  // Once the server render carries a day we already sent, the local copy goes.
  useEffect(() => {
    setOverlay((current) => {
      let changed = false;
      const next = { ...current };
      for (const checkin of checkins) {
        const local = next[checkin.dayDate];
        if (local && !local.queued) {
          delete next[checkin.dayDate];
          changed = true;
        }
      }
      return changed ? next : current;
    });
  }, [checkins]);

  const merged = useMemo(() => {
    const byDay = new Map<DayKey, BoardCheckin>(checkins.map((c) => [c.dayDate, c]));
    for (const local of Object.values(overlay)) byDay.set(local.dayDate, local);
    return [...byDay.values()];
  }, [checkins, overlay]);

  const cells = useMemo(
    () => buildPathMap({ startedOn, today, checkins: merged }),
    [merged, startedOn, today],
  );

  const stats = useMemo(
    () => cycleStats({ startedOn, today, checkins: merged, rehearsalDays }),
    [merged, rehearsalDays, startedOn, today],
  );

  const todayCheckin = useMemo<ExistingCheckin | null>(() => {
    const found = merged.find((checkin) => checkin.dayDate === today);
    if (!found) return null;
    return {
      status: found.status,
      note: found.note,
      cueStepIds: found.cueStepIds,
      photoKey: found.photoKey,
      queued: overlay[today]?.queued ?? false,
    };
  }, [merged, overlay, today]);

  const handleSubmit = useCallback(
    async (draft: CheckinDraft) => {
      const entry: OutboxEntry = {
        clientId: newId(),
        manifestationId,
        dayDate: today,
        status: draft.status,
        note: draft.note,
        cueStepIds: draft.cueStepIds,
        photo: draft.photo,
        photoKey: draft.photoKey,
        queuedAt: Date.now(),
      };

      // The record lands locally first, so 足跡 moves straight away and the day
      // is safe even if the tab closes before the network comes back.
      let stored = false;
      if (outboxSupported()) {
        try {
          await queueCheckin(entry);
          stored = true;
        } catch {
          // Storage refused it (private browsing, blocked site data): the
          // direct send below is then the only route.
        }
      }

      setOverlay((current) => ({
        ...current,
        [today]: {
          dayDate: today,
          status: draft.status,
          note: draft.note,
          photoKey: draft.photoKey,
          cueStepIds: draft.cueStepIds,
          queued: true,
        },
      }));
      setPendingCount((count) => (stored ? Math.max(count, 1) : count));
      setMessage(null);

      if (stored) {
        const result = await sync();
        if (!result || result.refused.length > 0) {
          clearOverlayDay(today);
          setMessage({ tone: 'warm', text: tErrors('saveFailed') });
        } else if (result.kept.length > 0) {
          // Nothing is lost: the day is on the device and will go up later.
          setMessage({ tone: 'warm', text: t('queuedOffline') });
        } else if (result.photoRefused) {
          setMessage({ tone: 'warm', text: t('photoNotSent') });
        } else {
          setMessage({ tone: 'quiet', text: savedMessage(draft.status, t) });
        }
        return;
      }

      const outcome = await sendEntry(entry);

      if (outcome.kind === 'synced') {
        setOverlay((current) => {
          const local = current[today];
          return local ? { ...current, [today]: { ...local, queued: false } } : current;
        });
        router.refresh();
        setMessage({
          tone: outcome.photoRefused ? 'warm' : 'quiet',
          text: outcome.photoRefused ? t('photoNotSent') : savedMessage(draft.status, t),
        });
        return;
      }

      // Nothing was stored on the device, so this really is a failed save:
      // the day comes back off the board rather than looking recorded.
      clearOverlayDay(today);
      setMessage({ tone: 'warm', text: tErrors('saveFailed') });
    },
    [clearOverlayDay, manifestationId, router, sync, t, tErrors, today],
  );

  return (
    <div className="space-y-8">
      <CheckinCard
        cues={cues}
        dayDate={today}
        existing={todayCheckin}
        message={message}
        onSubmit={handleSubmit}
        pendingCount={pendingCount}
        photoUrl={
          todayCheckin?.photoKey ? `/api/photos/${encodePhotoKey(todayCheckin.photoKey)}` : null
        }
      />

      <Footprints cells={cells} />
      <CycleStatsPanel stats={stats} />
    </div>
  );
}

function savedMessage(status: CheckinStatus, t: (key: string) => string): string {
  if (status === 'done') return t('savedDone');
  if (status === 'partial') return t('savedPartial');
  return t('savedMissed');
}

function encodePhotoKey(key: string): string {
  return key.split('/').map(encodeURIComponent).join('/');
}
