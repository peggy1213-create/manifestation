import { getTranslations } from 'next-intl/server';
import { emptyManifestationInput } from '@clearpath/core';
import { ManifestationBuilder } from '@/components/manifestation-builder';
import { getViewer } from '@/lib/viewer';

export async function generateMetadata() {
  const t = await getTranslations('builder');
  return { title: t('titleNew') };
}

/**
 * A blank 顯化. Nothing is written until the first autosave, which also creates the guest
 * session — so arriving here costs the person nothing.
 */
export default async function NewManifestationPage() {
  const viewer = await getViewer();

  return (
    <ManifestationBuilder
      manifestationId={null}
      initialInput={emptyManifestationInput()}
      initialStatus="draft"
      isGuest={viewer?.isGuest ?? true}
    />
  );
}
