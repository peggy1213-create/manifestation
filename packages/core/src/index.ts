// Pure TS domain logic for Clear Path (顯化). No React, no framework imports.

export const CORE_PACKAGE_NAME = '@clearpath/core';

export {
  DEFAULT_TIME_ZONE,
  addDays,
  compareLocalDates,
  daysBetween,
  formatLocalDate,
  isLocalDate,
  parseLocalDate,
  toLocalDate,
  todayIn,
  type LocalDate,
  type LocalDateParts,
} from './dates';

export {
  CYCLE_LENGTH,
  buildPath,
  cycleBounds,
  cyclePosition,
  dateOfDay,
  dayIndex,
  footprintsByDate,
  stoneState,
  type BuildPathOptions,
  type CycleBounds,
  type CyclePosition,
  type Footprint,
  type FootprintQuality,
  type Path,
  type PathStone,
  type StoneState,
} from './cycle';

export { pathStats, type PathStats } from './stats';

export { pathLayout, type PathLayout, type PathLayoutOptions, type PathPoint } from './path-layout';
