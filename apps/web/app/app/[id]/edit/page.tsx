import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { canEdit, emptyManifestationInput, emptyStep } from '@clearpath/core';
import { getManifestation } from '@clearpath/core/repo';
import { ManifestationBuilder } from '@/components/manifestation-builder';
import { ManifestationView } from '@/components/manifestation-view';
import { getDb } from '@/lib/db';
import { getViewer } from '@/lib/viewer';

export async function generateMetadata() {
  const t = await getTranslations('builder');
  return { title: t('titleEdit') };
}

export default async function EditManifestationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const viewer = await getViewer();
  if (!viewer) notFound();

  const db = await getDb();
  const manifestation = await getManifestation(db, viewer.userId, id);
  if (!manifestation) notFound();

  // A released 顯化 is kept, not edited.
  if (!canEdit(manifestation.status)) return <ManifestationView manifestation={manifestation} />;

  return (
    <ManifestationBuilder
      manifestationId={manifestation.id}
      initialInput={{
        ...emptyManifestationInput(),
        ...manifestation,
        steps: manifestation.steps.length > 0 ? manifestation.steps : [emptyStep()],
      }}
      initialStatus={manifestation.status}
      isGuest={viewer.isGuest}
    />
  );
}
