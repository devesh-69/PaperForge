import React, { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { Outlet, useLocation, useMatches } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useStorageEstimate } from '../../hooks/useStorageEstimate';
import { isRouteHandle, type RouteHandle } from '../../routes/routeMeta';
import { markVisited } from '../../utils/visited';
import { CommandPalette } from './CommandPalette';
import { Footer } from './Footer';
import { ShortcutsDialog } from './ShortcutsDialog';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';

const RAIL_KEY = 'pf:sidebar-rail';
const FALLBACK: RouteHandle = { title: 'PaperForge', section: 'home' };

function readRailPref(): boolean {
  try { return localStorage.getItem(RAIL_KEY) === '1'; } catch { return false; }
}

/** The frame around every app page: sidebar, top bar, search, footer. */
export const AppShell: React.FC = () => {
  const matches = useMatches();
  const { pathname } = useLocation();
  const handle = [...matches].reverse().map((m) => m.handle).find(isRouteHandle) ?? FALLBACK;
  const { isStorageLow, usagePct } = useStorageEstimate();

  const [drawer, setDrawer] = useState(false);
  const [railPref, setRailPref] = useState(readRailPref);
  const [expandedHere, setExpandedHere] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const mainRef = useRef<HTMLElement>(null);
  const firstRender = useRef(true);

  // pages with their own side list force the icon rail (unless the user expands it there)
  const rail = handle.rail ? !expandedHere : railPref;

  const toggleRail = useCallback(() => {
    if (handle.rail) { setExpandedHere((v) => !v); return; }
    setRailPref((v) => {
      try { localStorage.setItem(RAIL_KEY, v ? '0' : '1'); } catch { /* storage may be unavailable */ }
      return !v;
    });
  }, [handle.rail]);

  // on every page change: tab title, close the drawer, move focus to the content, scroll to top
  useEffect(() => {
    document.title = handle.title === 'PaperForge' ? 'PaperForge' : `${handle.title} · PaperForge`;
    setDrawer(false);
    setExpandedHere(false);
    if (firstRender.current) { firstRender.current = false; return; }
    window.scrollTo(0, 0);
    mainRef.current?.focus({ preventScroll: true });
  }, [pathname, handle.title]);

  // remember this browser uses the app (the bare address then opens Home)
  useEffect(() => { markVisited(); }, []);

  // private working pages must not be indexed
  useEffect(() => {
    let tag = document.querySelector<HTMLMetaElement>('meta[name="robots"]');
    if (!tag) { tag = document.createElement('meta'); tag.name = 'robots'; document.head.appendChild(tag); }
    tag.content = handle.private === false ? 'index,follow' : 'noindex,nofollow';
  }, [handle.private]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setPaletteOpen((o) => !o); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className={`app-shell ${rail ? 'is-rail' : ''}`}>
      <a className="skip-link" href="#main">Skip to content</a>
      <Toaster position="top-right" />
      <Sidebar
        section={handle.section}
        open={drawer}
        onNavigate={() => setDrawer(false)}
        onShowShortcuts={() => setShortcutsOpen(true)}
        usagePct={usagePct}
        storageLow={isStorageLow}
      />
      {drawer && <div className="shell-scrim" onClick={() => setDrawer(false)} aria-hidden="true"></div>}

      <div className="app-body">
        <Topbar handle={handle} rail={rail} onOpenDrawer={() => setDrawer(true)} onToggleRail={toggleRail} onOpenSearch={() => setPaletteOpen(true)} />
        {isStorageLow && (
          <div className="alert alert-warning m-0 text-center rounded-0 border-0 border-bottom border-warning" role="alert">
            <i className="bi bi-exclamation-triangle-fill me-2"></i>
            <strong>Storage warning:</strong> your browser storage is {usagePct.toFixed(1)}% full. Delete old items or download a backup to free space.
          </div>
        )}
        <main id="main" ref={mainRef} className={`app-main ${handle.rail ? 'is-flush' : ''}`} tabIndex={-1}>
          <Suspense
            fallback={
              <div className="text-center py-5">
                <div className="spinner-border text-secondary" role="status"><span className="visually-hidden">Loading…</span></div>
              </div>
            }
          >
            <Outlet />
          </Suspense>
        </main>
        <Footer />
      </div>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
      <ShortcutsDialog show={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
    </div>
  );
};
