/**
 * Thrown when a write is asked for against a manifestation that does not exist
 * or does not belong to the given userId. Both cases look the same on purpose:
 * one user must not be able to learn that another user's row exists.
 */
export class ManifestationNotFoundError extends Error {
  readonly manifestationId: string;

  constructor(manifestationId: string) {
    super(`Manifestation ${manifestationId} not found for this user`);
    this.name = 'ManifestationNotFoundError';
    this.manifestationId = manifestationId;
  }
}
