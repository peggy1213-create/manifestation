import { getRequestConfig } from 'next-intl/server';
import messages from '../messages/zh-TW.json';

/** One locale for now: every string the app shows lives in messages/zh-TW.json. */
export const LOCALE = 'zh-TW';
export const TIME_ZONE = 'Asia/Taipei';

export default getRequestConfig(async () => ({
  locale: LOCALE,
  timeZone: TIME_ZONE,
  messages,
}));
