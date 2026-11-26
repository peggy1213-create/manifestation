'use client';

import type { CheckinStatus } from '@clearpath/core';

/**
 * The offline outbox. Every 記下今天 is written here first and then synced, so a
 * check-in made on the MRT survives the tunnel, the tab closing and a reload.
 * IndexedDB, because a photo is stored as a Blob while it waits.
 */

const DB_NAME = 'clearpath';
const DB_VERSION = 1;
const STORE = 'checkin-outbox';

export interface OutboxEntry {
  /** Minted on the device; keeps a replayed entry from becoming two check-ins. */
  clientId: string;
  manifestationId: string;
  dayDate: string;
  status: CheckinStatus;
  note: string | null;
  cueStepIds: string[];
  /** A resized photo still waiting to be uploaded. */
  photo?: Blob | null;
  /** An R2 key, once the photo is up (or when the day already had one). */
  photoKey?: string | null;
  queuedAt: number;
  lastError?: string | null;
}

export function outboxSupported(): boolean {
  return typeof indexedDB !== 'undefined';
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'clientId' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('indexedDB open failed'));
  });
}

async function withStore<T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await openDatabase();
  try {
    return await new Promise<T>((resolve, reject) => {
      const transaction = db.transaction(STORE, mode);
      const request = run(transaction.objectStore(STORE));
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error('indexedDB request failed'));
      transaction.onabort = () => reject(transaction.error ?? new Error('indexedDB aborted'));
    });
  } finally {
    db.close();
  }
}

/** One entry per day per 顯化: recording today again replaces the queued one. */
export async function queueCheckin(entry: OutboxEntry): Promise<void> {
  const existing = await listQueued(entry.manifestationId);
  const sameDay = existing.find((queued) => queued.dayDate === entry.dayDate);
  if (sameDay) {
    await removeQueued(sameDay.clientId);
  }
  await withStore('readwrite', (store) => store.put(entry) as IDBRequest<IDBValidKey>);
}

export async function listQueued(manifestationId?: string): Promise<OutboxEntry[]> {
  const all = await withStore('readonly', (store) => store.getAll() as IDBRequest<OutboxEntry[]>);
  const entries = manifestationId
    ? all.filter((entry) => entry.manifestationId === manifestationId)
    : all;
  return entries.sort((a, b) => a.queuedAt - b.queuedAt);
}

export async function removeQueued(clientId: string): Promise<void> {
  await withStore('readwrite', (store) => store.delete(clientId) as IDBRequest<undefined>);
}

export async function markQueuedError(clientId: string, message: string): Promise<void> {
  const entry = await withStore(
    'readonly',
    (store) => store.get(clientId) as IDBRequest<OutboxEntry | undefined>,
  );
  if (!entry) return;
  await withStore(
    'readwrite',
    (store) => store.put({ ...entry, lastError: message }) as IDBRequest<IDBValidKey>,
  );
}
