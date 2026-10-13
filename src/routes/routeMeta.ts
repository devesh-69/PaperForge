/** Which sidebar entry a route belongs to (drives the highlighted nav item). */
export type NavSection = 'home' | 'templates' | 'questionSets' | 'letters' | 'papers' | 'backup';

/**
 * Metadata attached to every route as its React Router `handle`. One source for the
 * breadcrumb, the browser tab title and the sidebar highlight.
 */
export interface RouteHandle {
  title: string;
  section: NavSection;
  /** the page one level up in the breadcrumb */
  parent?: { label: string; to: string };
  /** the page has its own side list, so the app sidebar collapses to icons */
  rail?: boolean;
  /** the page is private working data: ask search engines not to index it */
  private?: boolean;
}

export function isRouteHandle(v: unknown): v is RouteHandle {
  return typeof v === 'object' && v !== null && 'title' in v && 'section' in v;
}
