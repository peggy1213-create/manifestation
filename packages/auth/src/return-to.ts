/**
 * Where to land after signing in.
 *
 * The value arrives in a query string, so it is only ever used when it is a
 * path on this site: anything absolute, protocol-relative, or otherwise
 * off-site falls back to the default. An open redirect through the sign-in
 * flow is how a convincing phishing link gets built.
 */

export const DEFAULT_RETURN_TO = '/app';

export function safeReturnTo(value: unknown, fallback: string = DEFAULT_RETURN_TO): string {
  if (typeof value !== 'string' || value.length === 0) return fallback;
  // "/\evil.example" and "//evil.example" are both read as off-site by browsers.
  if (!value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) return fallback;
  if (value.includes('\n') || value.includes('\r') || value.includes('\t')) return fallback;
  return value;
}
