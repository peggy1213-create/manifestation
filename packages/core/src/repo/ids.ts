/** uuid v4, from Web Crypto (available in Workers and in Node 20+). */
export function newId(): string {
  return crypto.randomUUID();
}
