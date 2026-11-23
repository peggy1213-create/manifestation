// Pure TS domain logic for Clear Path (顯化). No React, no framework imports.
// WOOP model, 66-day cycle and streak rules live here.

export const CORE_PACKAGE_NAME = '@clearpath/core';

export {
  CYCLE_LENGTH_DAYS,
  SAMPLE_PATH,
  buildPath,
  countAhead,
  countRecorded,
  samplePath,
} from './cycle';
export type { BuildPathInput, DayState, PathDay } from './cycle';
