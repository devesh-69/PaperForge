import React from 'react';
import type { RouteHandle } from '../../routes/routeMeta';
import { Breadcrumbs } from './Breadcrumbs';
import { NewMenu } from './NewMenu';

interface Props {
  handle: RouteHandle;
  rail: boolean;
  onOpenDrawer: () => void;
  onToggleRail: () => void;
  onOpenSearch: () => void;
}

export const Topbar: React.FC<Props> = ({ handle, rail, onOpenDrawer, onToggleRail, onOpenSearch }) => (
  <header className="topbar">
    <button type="button" className="topbar-btn topbar-menu-btn" onClick={onOpenDrawer} aria-label="Open menu" aria-controls="app-sidebar">
      <i className="bi bi-list fs-5"></i>
    </button>
    <button
      type="button"
      className="topbar-btn d-none d-lg-inline-grid"
      onClick={onToggleRail}
      aria-label={rail ? 'Expand sidebar' : 'Collapse sidebar'}
      title={rail ? 'Expand sidebar' : 'Collapse sidebar'}
    >
      <i className={`bi ${rail ? 'bi-layout-sidebar' : 'bi-layout-sidebar-inset'}`}></i>
    </button>
    <Breadcrumbs handle={handle} />
    <button type="button" className="search-trigger" onClick={onOpenSearch} aria-label="Search or jump to">
      <i className="bi bi-search"></i>
      <span className="search-label">Search or jump to…</span>
      <kbd>Ctrl K</kbd>
    </button>
    <NewMenu />
  </header>
);
