import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { primaryButtonClassName, quietButtonClassName } from '@/components/ui';

export default async function Home() {
  const t = await getTranslations('app');
  const tList = await getTranslations('list');

  return (
    <main
      id="main"
      className="mx-auto flex min-h-screen w-full max-w-[34rem] flex-col justify-center px-4 py-16"
    >
      <h1 className="text-display font-bold text-terracotta">{t('name')}</h1>
      <p className="mt-3 text-body text-ink/80">
        <span className="cp-highlight">{t('tagline')}</span>
      </p>
      <div className="mt-8 flex flex-wrap items-center gap-4">
        <Link href="/app/new" className={primaryButtonClassName}>
          {tList('new')}
        </Link>
        <Link href="/app" className={quietButtonClassName}>
          {tList('title')}
        </Link>
      </div>
    </main>
  );
}
