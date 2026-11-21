// D1 has no row-level security, so this file is the safety net: user B must not
// be able to read, change, delete or fetch anything belonging to user A.
import { beforeEach, describe, expect, it } from 'vitest';
import { bucket, db, makeFixture, type Fixture } from '../test/factories';
import {
  createBoardItem,
  deleteBoardItem,
  deleteBoardItems,
  getBoardItem,
  listBoardItems,
  reorderBoardItems,
  updateBoardItem,
} from './board-items';
import {
  deleteCheckin,
  getCheckin,
  getCheckinByDate,
  listCheckins,
  recordCheckin,
} from './checkins';
import { ManifestationNotFoundError } from './errors';
import {
  deleteManifestation,
  getManifestation,
  listManifestations,
  setManifestationStatus,
  updateManifestation,
} from './manifestations';
import { getOwnMedia, ownsMediaKey, serveMedia } from './media';
import {
  completeRehearsal,
  countCompletedRehearsals,
  listRehearsals,
  startRehearsal,
} from './rehearsals';
import { deleteReview, getReviewByWeek, listReviews, saveReview } from './reviews';
import { deleteSessionsForUser, listSessionsForUser, resolveSession } from './sessions';
import { deleteUser, getUserById, updateProfile } from './users';

let alice: Fixture;
let bob: Fixture;

beforeEach(async () => {
  alice = await makeFixture('alice');
  bob = await makeFixture('bob');
});

describe('user B cannot read user A', () => {
  it('resolves each session token to its own account only', async () => {
    // The userId every repo call is scoped by comes from here and nowhere else.
    expect((await resolveSession(db(), alice.token))?.user.id).toBe(alice.user.id);
    expect((await resolveSession(db(), bob.token))?.user.id).toBe(bob.user.id);
  });

  it('cannot read A 顯化 by id', async () => {
    expect(await getManifestation(db(), bob.user.id, alice.manifestation.id)).toBeNull();
  });

  it('does not see A 顯化 in a list', async () => {
    const mine = await listManifestations(db(), bob.user.id);
    expect(mine.map((m) => m.id)).toEqual([bob.manifestation.id]);
  });

  it('cannot read A 足跡', async () => {
    expect(await getCheckin(db(), bob.user.id, alice.checkin.id)).toBeNull();
    expect(
      await getCheckinByDate(db(), bob.user.id, alice.manifestation.id, alice.checkin.date),
    ).toBeNull();
    expect(await listCheckins(db(), bob.user.id, alice.manifestation.id)).toEqual([]);
  });

  it('cannot read A rehearsals', async () => {
    expect(await listRehearsals(db(), bob.user.id, alice.manifestation.id)).toEqual([]);
    expect(await countCompletedRehearsals(db(), bob.user.id, alice.manifestation.id)).toBe(0);
  });

  it('cannot read A reviews', async () => {
    expect(await listReviews(db(), bob.user.id, alice.manifestation.id)).toEqual([]);
    expect(
      await getReviewByWeek(db(), bob.user.id, alice.manifestation.id, alice.review.weekStart),
    ).toBeNull();
  });

  it('cannot read A 顯化板', async () => {
    expect(await listBoardItems(db(), bob.user.id, alice.manifestation.id)).toEqual([]);
    expect(await getBoardItem(db(), bob.user.id, alice.boardItem.id)).toBeNull();
  });

  it('cannot read A sessions, and A token does not resolve to B', async () => {
    const sessions = await listSessionsForUser(db(), bob.user.id);
    expect(sessions.every((s) => s.userId === bob.user.id)).toBe(true);

    const resolved = await resolveSession(db(), alice.token);
    expect(resolved?.user.id).toBe(alice.user.id);
  });
});

describe('user B cannot change user A', () => {
  it('cannot edit A 顯化', async () => {
    expect(
      await updateManifestation(db(), bob.user.id, alice.manifestation.id, {
        wish: '被改掉的願望',
      }),
    ).toBeNull();
    const unchanged = await getManifestation(db(), alice.user.id, alice.manifestation.id);
    expect(unchanged?.wish).toBe(alice.manifestation.wish);
  });

  it('cannot change the status of A 顯化', async () => {
    expect(
      await setManifestationStatus(db(), bob.user.id, alice.manifestation.id, 'released'),
    ).toBeNull();
    expect((await getManifestation(db(), alice.user.id, alice.manifestation.id))?.status).toBe(
      'active',
    );
  });

  it('cannot write a 足跡 under A 顯化', async () => {
    await expect(
      recordCheckin(db(), bob.user.id, {
        manifestationId: alice.manifestation.id,
        date: '2026-11-03',
        result: 'did',
        note: '不該存在的紀錄',
      }),
    ).rejects.toThrow(ManifestationNotFoundError);

    expect(await listCheckins(db(), alice.user.id, alice.manifestation.id)).toHaveLength(1);
  });

  it('cannot overwrite an existing 足跡 of A by writing the same day', async () => {
    await expect(
      recordCheckin(db(), bob.user.id, {
        manifestationId: alice.manifestation.id,
        date: alice.checkin.date,
        result: 'not_today',
      }),
    ).rejects.toThrow(ManifestationNotFoundError);

    const kept = await getCheckinByDate(
      db(),
      alice.user.id,
      alice.manifestation.id,
      alice.checkin.date,
    );
    expect(kept?.result).toBe('did');
    expect(kept?.note).toBe(alice.checkin.note);
  });

  it('cannot attach A photo to B own 足跡', async () => {
    await expect(
      recordCheckin(db(), bob.user.id, {
        manifestationId: bob.manifestation.id,
        date: '2026-11-05',
        result: 'did',
        photoKey: alice.photoKey,
      }),
    ).rejects.toThrow(/photoKey/);
  });

  it('cannot start or complete a rehearsal of A', async () => {
    await expect(startRehearsal(db(), bob.user.id, alice.manifestation.id)).rejects.toThrow(
      ManifestationNotFoundError,
    );
    expect(await completeRehearsal(db(), bob.user.id, alice.rehearsal.id)).toBeNull();
    const [aliceRehearsal] = await listRehearsals(db(), alice.user.id, alice.manifestation.id);
    expect(aliceRehearsal?.completed).toBe(false);
  });

  it('cannot write a review under A 顯化', async () => {
    await expect(
      saveReview(db(), bob.user.id, {
        manifestationId: alice.manifestation.id,
        weekStart: alice.review.weekStart,
        whatWorked: '不該存在的回顧',
      }),
    ).rejects.toThrow(ManifestationNotFoundError);

    const kept = await getReviewByWeek(
      db(),
      alice.user.id,
      alice.manifestation.id,
      alice.review.weekStart,
    );
    expect(kept?.whatWorked).toBe(alice.review.whatWorked);
  });

  it('cannot add to, edit or reorder A 顯化板', async () => {
    expect(
      await updateBoardItem(db(), bob.user.id, alice.boardItem.id, { text: '被改掉' }),
    ).toBeNull();
    await expect(
      reorderBoardItems(db(), bob.user.id, alice.manifestation.id, 'process', [alice.boardItem.id]),
    ).rejects.toThrow(ManifestationNotFoundError);

    await expect(
      createBoardItem(db(), bob.user.id, {
        manifestationId: alice.manifestation.id,
        zone: 'why',
        kind: 'words',
        text: '不該存在的卡片',
      }),
    ).rejects.toThrow(ManifestationNotFoundError);

    const kept = await getBoardItem(db(), alice.user.id, alice.boardItem.id);
    expect(kept?.text).toBe(alice.boardItem.text);
  });

  it('editing B profile leaves A untouched', async () => {
    await updateProfile(db(), bob.user.id, { displayName: 'bob 改名' });
    expect((await getUserById(db(), alice.user.id))?.displayName).toBe('alice');
  });
});

describe('user B cannot delete user A', () => {
  it('cannot delete A 顯化', async () => {
    expect(await deleteManifestation(db(), bob.user.id, alice.manifestation.id)).toBe(false);
    expect(await getManifestation(db(), alice.user.id, alice.manifestation.id)).not.toBeNull();
  });

  it('cannot delete A 足跡, review or board item', async () => {
    expect(await deleteCheckin(db(), bob.user.id, alice.checkin.id)).toBe(false);
    expect(await deleteReview(db(), bob.user.id, alice.review.id)).toBe(false);
    expect(await deleteBoardItem(db(), bob.user.id, alice.boardItem.id)).toBeNull();
    expect(await deleteBoardItems(db(), bob.user.id, [alice.boardItem.id])).toBe(0);

    expect(await getCheckin(db(), alice.user.id, alice.checkin.id)).not.toBeNull();
    expect(await getBoardItem(db(), alice.user.id, alice.boardItem.id)).not.toBeNull();
    expect(
      await getReviewByWeek(db(), alice.user.id, alice.manifestation.id, alice.review.weekStart),
    ).not.toBeNull();
  });

  it('cannot sign A out', async () => {
    await deleteSessionsForUser(db(), bob.user.id);
    expect(await resolveSession(db(), alice.token)).not.toBeNull();
  });

  it('cannot delete A account', async () => {
    expect(await deleteUser(db(), bob.user.id)).toBe(true);
    expect(await getUserById(db(), alice.user.id)).not.toBeNull();
  });
});

describe('user B cannot fetch user A media', () => {
  it('rejects A key for B', () => {
    expect(ownsMediaKey(bob.user.id, alice.photoKey)).toBe(false);
    expect(ownsMediaKey(alice.user.id, alice.photoKey)).toBe(true);
  });

  it('does not hand A object to B from R2', async () => {
    expect(await getOwnMedia(bucket(), bob.user.id, alice.photoKey)).toBeNull();
    expect(await getOwnMedia(bucket(), alice.user.id, alice.photoKey)).not.toBeNull();
  });

  it('answers 404 when B asks GET /media for A key', async () => {
    const response = await serveMedia({
      db: db(),
      bucket: bucket(),
      sessionToken: bob.token,
      key: alice.photoKey,
    });
    expect(response.status).toBe(404);
  });

  it('answers 200 when A asks for their own key', async () => {
    const response = await serveMedia({
      db: db(),
      bucket: bucket(),
      sessionToken: alice.token,
      key: alice.photoKey,
    });
    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('image/jpeg');
    const bytes = new Uint8Array(await response.arrayBuffer());
    expect(new TextDecoder().decode(bytes)).toBe('alice-photo');
  });

  it('answers 401 without a session, even for a real key', async () => {
    const anonymous = await serveMedia({
      db: db(),
      bucket: bucket(),
      sessionToken: null,
      key: alice.photoKey,
    });
    expect(anonymous.status).toBe(401);

    const madeUpToken = await serveMedia({
      db: db(),
      bucket: bucket(),
      sessionToken: 'not-a-real-token',
      key: alice.photoKey,
    });
    expect(madeUpToken.status).toBe(401);
  });
});
