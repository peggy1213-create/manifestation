import { notFound } from 'next/navigation';
import { getManifestation } from '@clearpath/core/repo';
import { ManifestationView } from '@/components/manifestation-view';
import { getDb } from '@/lib/db';
import { getViewer } from '@/lib/viewer';

export default async function ManifestationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const viewer = await getViewer();
  if (!viewer) notFound();

  const db = await getDb();
  const manifestation = await getManifestation(db, viewer.userId, id);
  if (!manifestation) notFound();

  return <ManifestationView manifestation={manifestation} />;
}
