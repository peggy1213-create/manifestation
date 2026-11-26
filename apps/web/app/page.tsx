import { PathMap } from '@/components/path-map';
import { messages } from '@/lib/messages';
import { samplePath } from '@/lib/sample-path';

const copy = messages.home;

export default function Home() {
  // An example path, so the hero shows what 66 days of footprints look like.
  const path = samplePath();

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-12 sm:px-6 sm:py-16">
      <h1 className="text-3xl font-bold text-terracotta sm:text-4xl">{copy.title}</h1>
      <p className="mt-4 max-w-2xl">{copy.lead}</p>

      <section className="mt-10 max-w-3xl rounded-lg bg-paper-2 p-4 sm:p-6">
        <PathMap path={path} />
        <p className="mt-2 text-sm opacity-70">{copy.pathCaption}</p>
      </section>

      <p className="mt-8 max-w-2xl text-sm opacity-80">{copy.evidence}</p>
    </main>
  );
}
