import { AuthError } from './errors';

export const MUTATING_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE'] as const;

export function isMutatingMethod(method: string): boolean {
  return (MUTATING_METHODS as readonly string[]).includes(method.toUpperCase());
}

export interface OriginCheckOptions {
  /** Trusted origin, e.g. `APP_ORIGIN`. Defaults to the request's own origin. */
  expectedOrigin?: string;
}

/**
 * CSRF defence for state-changing requests: the `Origin` header (or the
 * `Referer`, for the browsers that omit `Origin`) has to be our own origin.
 * A request with neither header is refused.
 */
export function isSameOrigin(request: Request, options: OriginCheckOptions = {}): boolean {
  if (!isMutatingMethod(request.method)) return true;

  const expected = normalizeOrigin(options.expectedOrigin ?? new URL(request.url).origin);
  if (!expected) return false;

  const origin = request.headers.get('origin');
  if (origin) return normalizeOrigin(origin) === expected;

  const referer = request.headers.get('referer');
  if (referer) return normalizeOrigin(referer) === expected;

  return false;
}

export function assertSameOrigin(request: Request, options: OriginCheckOptions = {}): void {
  if (!isSameOrigin(request, options)) {
    throw new AuthError('bad_origin', 'the request did not come from this site');
  }
}

function normalizeOrigin(value: string): string | null {
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}
