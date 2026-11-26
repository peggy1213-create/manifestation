import { PathMap } from '@/components/path-map';
import { messages } from '@/lib/messages';
import { samplePath } from '@/lib/sample-path';

const copy = messages.pathPage;

interface PathPageProps {
  params: Promise<{ id: string }>;
}

export default async function PathPage({ params }: PathPageProps) {
  const { id } = await params;

  // TODO(P09): read this 顯化 and its footprints through a repo function that takes the signed-in
  // userId and scopes every query by it. Until then the page shows the example path.
  const path = samplePath();

  return (
    <main
      data-manifestation-id={id}
      className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 sm:py-14"
    >
      <h1 className="text-2xl font-bold text-terracotta sm:text-3xl">{copy.heading}</h1>
      <section className="mt-6 rounded-lg bg-paper-2 p-3 sm:p-5">
        <PathMap path={path} />
      </section>
      <p className="mt-4 text-sm opacity-70">{copy.placeholder}</p>
    </main>
  );
}
