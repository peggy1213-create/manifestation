import Link from 'next/link';
import { getFormatter, getTranslations } from 'next-intl/server';
import { listManifestations } from '@clearpath/core/repo';
import { Sheet, StatusPill, primaryButtonClassName } from '@/components/ui';
import { getDb } from '@/lib/db';
import { getViewer } from '@/lib/viewer';

export async function generateMetadata() {
  const t = await getTranslations('list');
  return { title: t('title') };
}

/** A plain index of what this person has written. The 66-day path screen lands later. */
export default async function ManifestationListPage() {
  const t = await getTranslations('list');
  const tManifestation = await getTranslations('manifestation');
  const format = await getFormatter();

  const viewer = await getViewer();
  const manifestations = viewer ? await listManifestations(await getDb(), viewer.userId) : [];

  return (
    <main id="main" className="mx-auto w-full max-w-[34rem] px-4 pt-6 pb-16 sm:pt-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-display font-bold text-terracotta">{t('title')}</h1>
        <Link href="/app/new" className={primaryButtonClassName}>
          {t('new')}
        </Link>
      </div>

      {manifestations.length === 0 ? (
        <Sheet className="mt-6">
          <p className="text-body text-ink/75">{t('empty')}</p>
        </Sheet>
      ) : (
        <ul className="mt-6 space-y-3">
          {manifestations.map((manifestation) => (
            <li key={manifestation.id}>
              <Link href={`/app/${manifestation.id}`} className="block">
                <Sheet className="cp-margin-line">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-body font-bold">
                      {manifestation.wish || tManifestation('empty')}
                    </p>
                    <StatusPill>{tManifestation(`status.${manifestation.status}`)}</StatusPill>
                  </div>
                  <p className="mt-2 text-label text-ink/60">
                    {t('updatedAt', {
                      date: format.dateTime(new Date(manifestation.updatedAt), {
                        dateStyle: 'medium',
                      }),
                    })}
                  </p>
                </Sheet>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
