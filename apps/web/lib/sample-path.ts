// A worked example used by the home hero, and by /app/[id] until the D1 repo functions land.
//
// Nothing here reads the database. Real paths come from the user's own footprints through a repo
// function that takes a userId; this is illustration.
//
// Its dates are fixed rather than relative to the real today, for two reasons: the hero is
// prerendered, so a path built from "today" would freeze at build time and go stale, and a fixed
// example renders identically on the server and in the browser.

import { addDays, buildPath, type Footprint, type Path } from '@clearpath/core';

/** Day 1 of the example. Only its shape is on show; no absolute date is ever displayed. */
const START = '2026-03-01';

/** Days 1-26 of the example. `null` is a day that closed with nothing recorded. */
const PATTERN: readonly (Footprint['quality'] | null)[] = [
  'did',
  'did',
  'partly',
  'did',
  'did',
  null,
  'did',
  'did',
  'did',
  'partly',
  'did',
  null,
  'did',
  'did',
  'did',
  'did',
  'partly',
  'did',
  'did',
  null,
  'did',
  'did',
  'partly',
  'did',
  'did',
  'did',
];

/** Day 27 is "today" in the example, still open, so the path shows a ring waiting to be filled. */
const TODAY = addDays(START, PATTERN.length);

const FOOTPRINTS: Footprint[] = PATTERN.flatMap<Footprint>((quality, index) =>
  quality ? [{ date: addDays(START, index), quality }] : [],
);

/** An example path, a few weeks in, with today still open. */
export function samplePath(): Path {
  return buildPath({ startDate: START, today: TODAY, footprints: FOOTPRINTS });
}
