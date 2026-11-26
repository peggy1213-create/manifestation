/**
 * A row that does not belong to the asking user is reported as not found, never
 * as forbidden: the answer must not reveal that someone else's 顯化 exists.
 */
export class NotFoundError extends Error {
  constructor(what: string) {
    super(`${what} not found`);
    this.name = 'NotFoundError';
  }
}
