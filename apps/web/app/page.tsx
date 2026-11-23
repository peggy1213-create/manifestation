import { BoardPreview } from '@/components/home/board';
import { Closing } from '@/components/home/closing';
import { Faq } from '@/components/home/faq';
import { Hero } from '@/components/home/hero';
import { LatestResources } from '@/components/home/latest-resources';
import { Science } from '@/components/home/science';
import { Steps } from '@/components/home/steps';

export default function HomePage() {
  return (
    <>
      <Hero />
      <Steps />
      <Science />
      <BoardPreview />
      <LatestResources />
      <Faq />
      <Closing />
    </>
  );
}
