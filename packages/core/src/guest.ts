/**
 * Guest mode: someone can write one 顯化 before signing in. It lives in
 * `localStorage` on their own device and nowhere else. After sign-in we offer
 * to move it to the account; this module is the pure decision behind that
 * offer, so the same rules are testable without a browser or D1.
 */

export const GUEST_STORAGE_KEY = 'clearpath.guest.manifestation';

/** Field caps, matching the 顯化 editor. */
export const GUEST_WISH_MAX_LENGTH = 120;
export const GUEST_FIELD_MAX_LENGTH = 600;

/** Nothing older than the project itself is a plausible draft date. */
const EARLIEST_PLAUSIBLE_DRAFT = Date.UTC(2025, 0, 1);

export interface GuestDraft {
  /** 願望 — the only field a draft must have. */
  wish: string;
  /** 實現後的樣子. */
  outcome: string;
  /** 內在阻礙. */
  obstacle: string;
  /** if-then 小行動. */
  plan: string;
  /** Epoch milliseconds, when it was written in guest mode. */
  createdAt: number;
}

export interface AccountManifestation {
  id: string;
  wish: string;
  createdAt: number;
}

export type GuestMergeSkipReason = 'no-draft' | 'already-in-account' | 'account-not-empty';

export type GuestMergePlan =
  | { action: 'import'; draft: GuestDraft }
  | { action: 'skip'; reason: GuestMergeSkipReason; existingId?: string };

function clean(value: unknown, maxLength: number): string {
  if (typeof value !== 'string') return '';
  return value.replace(/\s+$/u, '').replace(/^\s+/u, '').slice(0, maxLength);
}

/**
 * Reads whatever `localStorage` held — a JSON string, a parsed object, or
 * junk — and returns a draft worth moving, or `null`. A draft needs a 願望;
 * the rest of the WOOP fields may still be empty.
 */
export function parseGuestDraft(raw: unknown, options: { now?: number } = {}): GuestDraft | null {
  const now = options.now ?? Date.now();

  let value: unknown = raw;
  if (typeof value === 'string') {
    try {
      value = JSON.parse(value);
    } catch {
      return null;
    }
  }
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;

  const record = value as Record<string, unknown>;
  const wish = clean(record.wish, GUEST_WISH_MAX_LENGTH);
  if (wish.length === 0) return null;

  const createdAt = record.createdAt;
  const plausible =
    typeof createdAt === 'number' &&
    Number.isFinite(createdAt) &&
    createdAt >= EARLIEST_PLAUSIBLE_DRAFT &&
    createdAt <= now + 24 * 60 * 60 * 1000;

  return {
    wish,
    outcome: clean(record.outcome, GUEST_FIELD_MAX_LENGTH),
    obstacle: clean(record.obstacle, GUEST_FIELD_MAX_LENGTH),
    plan: clean(record.plan, GUEST_FIELD_MAX_LENGTH),
    createdAt: plausible ? createdAt : now,
  };
}

/** Whitespace-insensitive comparison, so a re-typed 願望 still counts as the same one. */
export function isSameWish(a: string, b: string): boolean {
  const normalize = (value: string) => value.replace(/\s+/gu, '').toLowerCase();
  return normalize(a) === normalize(b) && normalize(a).length > 0;
}

/**
 * What to do with a guest draft once someone signs in. The account always
 * wins: a draft is only ever added, never written over an existing 顯化, and
 * moving the same draft twice does nothing the second time.
 */
export function planGuestMerge(
  draft: GuestDraft | null,
  accountManifestations: readonly AccountManifestation[] = [],
): GuestMergePlan {
  if (!draft) return { action: 'skip', reason: 'no-draft' };

  const alreadyThere = accountManifestations.find((existing) =>
    isSameWish(existing.wish, draft.wish),
  );
  if (alreadyThere) {
    return { action: 'skip', reason: 'already-in-account', existingId: alreadyThere.id };
  }

  if (accountManifestations.length > 0) {
    return { action: 'skip', reason: 'account-not-empty' };
  }

  return { action: 'import', draft };
}
