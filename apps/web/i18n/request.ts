import { getRequestConfig } from 'next-intl/server';

/** zh-TW is the only locale for now; every string lives in messages/zh-TW.json. */
export const locale = 'zh-TW';

export default getRequestConfig(async () => ({
  locale,
  messages: (await import('../messages/zh-TW.json')).default,
}));
