'use client';

import { GUEST_STORAGE_KEY, parseGuestDraft, type GuestDraft } from '@clearpath/core/guest';

/**
 * Guest mode storage: one 顯化, in this browser only. Every access is wrapped,
 * because localStorage throws in private mode and when storage is full.
 */
export function readGuestDraft(): GuestDraft | null {
  try {
    return parseGuestDraft(window.localStorage.getItem(GUEST_STORAGE_KEY));
  } catch {
    return null;
  }
}

export function writeGuestDraft(draft: GuestDraft): boolean {
  try {
    window.localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(draft));
    return true;
  } catch {
    return false;
  }
}

export function clearGuestDraft(): void {
  try {
    window.localStorage.removeItem(GUEST_STORAGE_KEY);
  } catch {
    // Nothing to do: the draft was never stored.
  }
}
