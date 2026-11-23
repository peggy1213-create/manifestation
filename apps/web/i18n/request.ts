import { getRequestConfig } from 'next-intl/server';
import messages from '../messages/zh-TW.json';

/**
 * Clear Path is zh-TW first and, for now, zh-TW only: there is no locale segment
 * in the URL and no locale negotiation. The config below is therefore constant,
 * which matters — it touches no request-scoped API, so every page that uses
 * translations can still be rendered statically at build time.
 *
 * When a second locale arrives, this is the one place that needs to start
 * reading `requestLocale`.
 */
export const locale = 'zh-TW';
export const timeZone = 'Asia/Taipei';

export default getRequestConfig(async () => ({ locale, timeZone, messages }));
