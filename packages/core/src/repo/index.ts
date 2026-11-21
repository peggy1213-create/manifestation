// The only door to D1. Every function takes a userId and scopes every query by
// it: D1 has no row-level security, so this layer is the boundary.
// Components and route handlers call these — never D1 or Drizzle directly.

export * from './errors';
export * from './ids';
export * from './users';
export * from './sessions';
export * from './manifestations';
export * from './checkins';
export * from './rehearsals';
export * from './reviews';
export * from './board-items';
export * from './media';
