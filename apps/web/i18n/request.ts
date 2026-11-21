import { getRequestConfig } from 'next-intl/server';

/**
 * One locale for now: zh-TW. All user-facing copy lives in messages/zh-TW.json,
 * so no string is hard-coded in a component.
 */
export const locale = 'zh-TW';

export default getRequestConfig(async () => ({
  locale,
  messages: (await import('../messages/zh-TW.json')).default,
}));
