/**
 * Pure TS domain logic and D1 access for Clear Path (顯化). No React, no
 * framework imports. Components never query D1 directly: they call a repo
 * function here, and every one of those takes a `userId` and scopes by it.
 */
export const CORE_PACKAGE_NAME = '@clearpath/core';

export { createDatabase, schema } from './db/client';
export type { Database } from './db/client';
export { manifestations, sessions, users } from './db/schema';
export type { ManifestationRow, SessionRow, UserRow } from './db/schema';
export { newId } from './ids';

export { deleteUser, findUserByGoogleSub, findUserById, upsertUserByGoogleSub } from './repo/users';
export type { UpsertUserInput } from './repo/users';

export {
  createSession,
  deleteExpiredSessions,
  deleteSessionByTokenHash,
  deleteSessionsForUser,
  findActiveSession,
  renewSession,
  SESSION_TTL_MS,
} from './repo/sessions';
export type { ActiveSession, CreateSessionInput } from './repo/sessions';

export {
  countManifestations,
  createManifestation,
  deleteManifestation,
  findManifestation,
  listManifestations,
  listManifestationSummaries,
} from './repo/manifestations';
export type { ManifestationInput, ManifestationSummary } from './repo/manifestations';

export {
  isSameWish,
  parseGuestDraft,
  planGuestMerge,
  GUEST_FIELD_MAX_LENGTH,
  GUEST_STORAGE_KEY,
  GUEST_WISH_MAX_LENGTH,
} from './guest';
export type {
  AccountManifestation,
  GuestDraft,
  GuestMergePlan,
  GuestMergeSkipReason,
} from './guest';
