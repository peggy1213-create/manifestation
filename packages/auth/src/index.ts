// Hand-rolled OAuth 2.0 authorization code + PKCE, Web Crypto only (no auth libraries,
// no Node crypto). The Google (P04) and Apple (P20) flows land here; session cookies
// and the origin check for mutating requests live in ./session.

export const AUTH_PACKAGE_NAME = '@clearpath/auth';

export * from './session';
