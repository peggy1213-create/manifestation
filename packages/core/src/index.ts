// Pure TS domain logic for Clear Path (顯化). No React, no framework, no database imports.
// Data access lives in the '@clearpath/core/repo' entry point.

export const CORE_PACKAGE_NAME = '@clearpath/core';

export * from './manifestation';
export * from './likelihood';
export * from './validation';
export * from './care';
