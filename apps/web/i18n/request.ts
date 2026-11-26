import { getRequestConfig } from 'next-intl/server';
import messages from '../messages/zh-TW.json';

/**
 * zh-TW is the only locale: every string a person reads comes from
 * messages/zh-TW.json, never from a hardcoded literal in a component.
 */
export const LOCALE = 'zh-TW';

export default getRequestConfig(async () => ({
  locale: LOCALE,
  timeZone: 'Asia/Taipei',
  messages,
}));
