/** Ids are random UUIDs from Web Crypto — available in Workers, Node 20+ and browsers. */
export function newId(): string {
  return crypto.randomUUID();
}
