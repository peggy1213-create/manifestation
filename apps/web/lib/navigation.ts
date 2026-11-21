/**
 * Every route in the app, plus the nav sets the shell renders. Labels live in
 * messages/zh-TW.json; only message *keys* appear here.
 */
export const routes = {
  home: '/',
  resources: '/resources',
  about: '/about',
  privacy: '/privacy',
  contact: '/contact',
  login: '/login',
  space: '/space',
  manifestations: '/space/manifestations',
  board: '/space/board',
  rehearsal: '/space/rehearsal',
  footprints: '/space/footprints',
} as const;

export type NavItem<TKey extends string> = {
  /** Key inside the nav's message namespace. */
  readonly key: TKey;
  readonly href: string;
  /**
   * `exact` marks the item active only on that exact path; `prefix` also marks
   * it active on anything nested below it.
   */
  readonly match: 'exact' | 'prefix';
};

/** Header nav: 首頁 · 資源 · 顯化空間. */
export const primaryNav = [
  { key: 'home', href: routes.home, match: 'exact' },
  { key: 'resources', href: routes.resources, match: 'prefix' },
  { key: 'space', href: routes.space, match: 'prefix' },
] as const satisfies readonly NavItem<'home' | 'resources' | 'space'>[];

/** 顯化空間 nav: a bottom tab bar on mobile, a sub-nav from md up. */
export const spaceNav = [
  { key: 'today', href: routes.space, match: 'exact' },
  { key: 'manifestations', href: routes.manifestations, match: 'prefix' },
  { key: 'board', href: routes.board, match: 'prefix' },
  { key: 'rehearsal', href: routes.rehearsal, match: 'prefix' },
  { key: 'footprints', href: routes.footprints, match: 'prefix' },
] as const satisfies readonly NavItem<
  'today' | 'manifestations' | 'board' | 'rehearsal' | 'footprints'
>[];

/** Footer nav: about · privacy · contact. */
export const footerNav = [
  { key: 'about', href: routes.about, match: 'prefix' },
  { key: 'privacy', href: routes.privacy, match: 'prefix' },
  { key: 'contact', href: routes.contact, match: 'prefix' },
] as const satisfies readonly NavItem<'about' | 'privacy' | 'contact'>[];

/** Whether `pathname` should give a nav item `aria-current="page"`. */
export function isActiveHref(pathname: string, item: NavItem<string>): boolean {
  const path = normalise(pathname);
  const href = normalise(item.href);
  if (item.match === 'exact' || href === '/') return path === href;
  return path === href || path.startsWith(`${href}/`);
}

/** True on the 顯化空間 screens, which swap the header menu for a tab bar. */
export function isSpacePath(pathname: string): boolean {
  const path = normalise(pathname);
  return path === routes.space || path.startsWith(`${routes.space}/`);
}

/** Drop a trailing slash so `/resources/` and `/resources` match. */
function normalise(pathname: string): string {
  if (pathname.length > 1 && pathname.endsWith('/')) return pathname.slice(0, -1);
  return pathname;
}
