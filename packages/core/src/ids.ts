/** Row ids: UUID v4 from Web Crypto, so they carry no user data and no ordering. */
export function newId(): string {
  return crypto.randomUUID();
}
