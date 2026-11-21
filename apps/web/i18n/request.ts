import { getRequestConfig } from 'next-intl/server';
import { defaultLocale, timeZone } from './config';

// Read by next-intl via createNextIntlPlugin() in next.config.ts. There is a
// single locale, so the request locale is constant rather than taken from a
// `[locale]` route segment.
export default getRequestConfig(async () => ({
  locale: defaultLocale,
  timeZone,
  messages: (await import(`../messages/${defaultLocale}.json`)).default,
}));
