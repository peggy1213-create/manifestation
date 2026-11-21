export type SameSite = 'Lax' | 'Strict' | 'None';

export interface CookieOptions {
  maxAge?: number;
  path?: string;
  sameSite?: SameSite;
  httpOnly?: boolean;
  secure?: boolean;
}

/**
 * Serialises a `Set-Cookie` value. Defaults are the ones every cookie in this
 * app uses: HttpOnly, Secure, SameSite=Lax, Path=/.
 */
export function serializeCookie(name: string, value: string, options: CookieOptions = {}): string {
  const { maxAge, path = '/', sameSite = 'Lax', httpOnly = true, secure = true } = options;

  const parts = [`${name}=${value}`, `Path=${path}`, `SameSite=${sameSite}`];
  if (typeof maxAge === 'number') {
    parts.push(`Max-Age=${Math.max(0, Math.floor(maxAge))}`);
    parts.push(`Expires=${new Date(Date.now() + Math.max(0, maxAge) * 1000).toUTCString()}`);
  }
  if (httpOnly) parts.push('HttpOnly');
  if (secure) parts.push('Secure');
  return parts.join('; ');
}

/** A `Set-Cookie` value that deletes `name`. */
export function clearCookie(name: string, options: CookieOptions = {}): string {
  return serializeCookie(name, '', { ...options, maxAge: 0 });
}

export function parseCookieHeader(header: string | null | undefined): Record<string, string> {
  const jar: Record<string, string> = {};
  if (!header) return jar;
  for (const pair of header.split(';')) {
    const index = pair.indexOf('=');
    if (index < 1) continue;
    const name = pair.slice(0, index).trim();
    if (!name || name in jar) continue;
    jar[name] = pair.slice(index + 1).trim();
  }
  return jar;
}

export function readCookie(request: Request, name: string): string | undefined {
  return parseCookieHeader(request.headers.get('cookie'))[name];
}
