import type messages from './messages/zh-TW.json';

declare module 'next-intl' {
  interface AppConfig {
    Messages: typeof messages;
  }
}
