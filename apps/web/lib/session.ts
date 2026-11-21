/**
 * Placeholder for the session lookup. Google sign-in (authorization code +
 * PKCE, @clearpath/auth) lands in P04; until then the shell renders its
 * signed-out state, and the header is already written against this shape so
 * only this function changes.
 */
export type SessionUser = {
  readonly name: string;
  readonly email: string;
};

export async function getCurrentUser(): Promise<SessionUser | null> {
  return null;
}
