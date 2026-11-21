/**
 * Clear Path ships zh-TW only, so there is no locale segment in the URL and no
 * next-intl middleware. Adding a second locale later means switching to
 * next-intl's routing setup; everything else reads the locale from here.
 */
export const locales = ['zh-TW'] as const;

export type AppLocale = (typeof locales)[number];

export const defaultLocale: AppLocale = 'zh-TW';

/** BCP 47 locale rewritten for Open Graph's `og:locale` (underscore form). */
export const openGraphLocale = 'zh_TW';

/** Clock used for 66-day paths and daily footprints. */
export const timeZone = 'Asia/Taipei';
