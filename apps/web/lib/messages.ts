// zh-TW copy lives in messages/zh-TW.json, which is where next-intl will read it from once it
// lands. Until then this module is the only way the app reads copy, so no string is ever written
// into a component.

import zhTW from '@/messages/zh-TW.json';

export const messages = zhTW;

/**
 * Fill `{name}` placeholders in a message.
 * next-intl's ICU formatting replaces this the moment it is wired up.
 */
export function fill(template: string, values: Record<string, string | number> = {}): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => {
    const value = values[key];
    return value === undefined ? match : String(value);
  });
}
