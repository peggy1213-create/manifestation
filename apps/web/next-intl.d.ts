// Types every message key against messages/zh-TW.json, so a typo in
// t('nav.hoem') is a build error rather than a missing string at runtime.
import type messages from './messages/zh-TW.json';
import type { AppLocale } from './i18n/config';

declare module 'next-intl' {
  interface AppConfig {
    Locale: AppLocale;
    Messages: typeof messages;
  }
}
