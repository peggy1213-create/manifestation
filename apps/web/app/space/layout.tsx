import type { ReactNode } from 'react';
import { SpaceNav } from '@/components/space-nav';

/**
 * 顯化空間 screens. Navigation between them is a sub-nav under the header from
 * md up, and a bottom tab bar below md — where the header menu steps aside for
 * it (see components/mobile-menu.tsx). Each screen declares its own metadata.
 */
export default function SpaceLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <>
      <SpaceNav variant="inline" />
      {children}
      <SpaceNav variant="tabbar" />
    </>
  );
}
