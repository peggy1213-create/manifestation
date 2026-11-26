'use client';

import type { Checkin } from '@clearpath/core';
import { listQueued, markQueuedError, removeQueued, type OutboxEntry } from './outbox';

/**
 * Sending a queued 記下今天 to the server. Each entry is a whole day's record,
 * so sending it twice is harmless: the server keeps one check-in per day and
 * replaces it.
 */

/** 400-family answers that will not change on a retry. */
function isPermanentRefusal(status: number): boolean {
  return status === 400 || status === 403 || status === 404 || status === 413 || status === 415;
}

export type SendOutcome =
  | { kind: 'synced'; checkin: Checkin; photoRefused: boolean }
  /** Network or server trouble: the entry is worth keeping and retrying. */
  | { kind: 'retry'; reason: string }
  /** The server refused it outright; retrying would not help. */
  | { kind: 'refused'; status: number };

async function uploadPhoto(
  manifestationId: string,
  dayDate: string,
  photo: Blob,
): Promise<{ key: string } | { refused: number } | 'retry'> {
  const form = new FormData();
  form.set('dayDate', dayDate);
  form.set('photo', new File([photo], `${dayDate}.jpg`, { type: photo.type || 'image/jpeg' }));

  let response: Response;
  try {
    response = await fetch(`/api/manifestations/${manifestationId}/photos`, {
      method: 'POST',
      body: form,
    });
  } catch {
    return 'retry';
  }

  if (response.ok) {
    const body = (await response.json()) as { key?: unknown };
    return typeof body.key === 'string' ? { key: body.key } : 'retry';
  }

  return isPermanentRefusal(response.status) ? { refused: response.status } : 'retry';
}

/** Sends one entry: photo first, then the day itself. */
export async function sendEntry(entry: OutboxEntry): Promise<SendOutcome> {
  let photoKey = entry.photoKey ?? null;
  let photoRefused = false;

  if (entry.photo) {
    const upload = await uploadPhoto(entry.manifestationId, entry.dayDate, entry.photo);
    if (upload === 'retry') return { kind: 'retry', reason: 'photo' };
    if ('refused' in upload) {
      // The day still deserves to be recorded; the photo is reported as not
      // sent rather than quietly dropped or retried forever.
      photoRefused = true;
    } else {
      photoKey = upload.key;
    }
  }

  let response: Response;
  try {
    response = await fetch(`/api/manifestations/${entry.manifestationId}/checkins`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        dayDate: entry.dayDate,
        status: entry.status,
        note: entry.note,
        cueStepIds: entry.cueStepIds,
        photoKey,
        clientId: entry.clientId,
      }),
    });
  } catch {
    return { kind: 'retry', reason: 'offline' };
  }

  if (response.ok) {
    const body = (await response.json()) as { checkin: Checkin };
    return { kind: 'synced', checkin: body.checkin, photoRefused };
  }

  return isPermanentRefusal(response.status)
    ? { kind: 'refused', status: response.status }
    : { kind: 'retry', reason: `http_${response.status}` };
}

export interface FlushResult {
  synced: { entry: OutboxEntry; checkin: Checkin }[];
  kept: OutboxEntry[];
  refused: { entry: OutboxEntry; status: number }[];
  photoRefused: boolean;
}

/** Drains the outbox for one 顯化, oldest entry first. */
export async function flushOutbox(manifestationId: string): Promise<FlushResult> {
  const result: FlushResult = { synced: [], kept: [], refused: [], photoRefused: false };

  for (const entry of await listQueued(manifestationId)) {
    const outcome = await sendEntry(entry);

    if (outcome.kind === 'synced') {
      await removeQueued(entry.clientId);
      result.synced.push({ entry, checkin: outcome.checkin });
      if (outcome.photoRefused) result.photoRefused = true;
    } else if (outcome.kind === 'refused') {
      await removeQueued(entry.clientId);
      result.refused.push({ entry, status: outcome.status });
    } else {
      await markQueuedError(entry.clientId, outcome.reason);
      result.kept.push(entry);
    }
  }

  return result;
}
