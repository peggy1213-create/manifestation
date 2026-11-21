import { assertSameOrigin, clearedSessionCookie } from '@clearpath/auth';
import { getAppOrigin } from '@/lib/env';
import { endSession } from '@/lib/auth/session';
import { errorRedirect, reasonForError } from '@/lib/auth/errors';

export const dynamic = 'force-dynamic';

/** Sign-out: the session row goes, then the cookie. */
export async function POST(request: Request): Promise<Response> {
  const origin = getAppOrigin(request);

  try {
    assertSameOrigin(request, { expectedOrigin: origin });
    await endSession(request);

    return new Response(null, {
      status: 303,
      headers: {
        location: `${origin}/`,
        'set-cookie': clearedSessionCookie(),
        'cache-control': 'no-store',
      },
    });
  } catch (error) {
    return errorRedirect(origin, reasonForError(error));
  }
}
