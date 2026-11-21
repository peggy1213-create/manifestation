export const DEFAULT_RETURN_TO = '/app';

/**
 * Only a same-origin path is ever redirected to after sign-in: it must start
 * with a single `/`, carry no scheme, host, backslash or control character.
 */
export function safeReturnTo(
  value: string | null | undefined,
  fallback = DEFAULT_RETURN_TO,
): string {
  if (typeof value !== 'string') return fallback;
  const candidate = value.trim();
  if (candidate.length === 0 || candidate.length > 512) return fallback;
  if (!candidate.startsWith('/')) return fallback;
  if (candidate.startsWith('//')) return fallback;
  if (candidate.includes('\\')) return fallback;
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001f\u007f]/.test(candidate)) return fallback;
  return candidate;
}
