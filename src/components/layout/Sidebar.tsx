import React from 'react';
import { Link } from 'react-router-dom';
import { useWorkspaceCounts } from '../../hooks/useWorkspaceCounts';
import type { NavSection } from '../../routes/routeMeta';
import { NAV_GROUPS } from './navConfig';
import { StorageMeter } from './StorageMeter';

interface Props {
  /** the section of the current page */
  section: NavSection;
  /** mobile drawer is open */
  open: boolean;
  /** called after a link is followed (closes the drawer) */
  onNavigate: () => void;
  onShowShortcuts: () => void;
  usagePct: number;
  storageLow: boolean;
}

export const Sidebar: React.FC<Props> = ({ section, open, onNavigate, onShowShortcuts, usagePct, storageLow }) => {
  const { counts } = useWorkspaceCounts();

  return (
    <aside className={`shell-sidebar ${open ? 'is-open' : ''}`} id="app-sidebar" aria-label="Main navigation">
      <Link className="side-brand" to="/" onClick={onNavigate} aria-label="PaperForge website">
        <img src="/paperforge-64x64.ico" alt="" width="26" height="26" />
        <span className="side-text">PaperForge</span>
      </Link>
      <nav aria-label="Primary">
        {NAV_GROUPS.map((group, i) => (
          <div key={group.label ?? i}>
            {group.label && <div className="side-group-label"><span className="side-text">{group.label}</span></div>}
            {group.items.map((item) => {
              const active = item.section === section;
              const count = item.countKey ? counts[item.countKey] : undefined;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`side-item ${active ? 'active' : ''}`}
                  aria-current={active ? 'page' : undefined}
                  title={item.label}
                  onClick={onNavigate}
                >
                  <i className={`bi ${item.icon}`}></i>
                  <span className="side-text">{item.label}</span>
                  {count !== undefined && <span className="side-count side-text">{count}</span>}
                </Link>
              );
            })}
          </div>
        ))}
        <button type="button" className="side-item mt-2" title="Keyboard shortcuts" onClick={() => { onShowShortcuts(); onNavigate(); }}>
          <i className="bi bi-keyboard"></i>
          <span className="side-text">Shortcuts</span>
        </button>
      </nav>
      <div className="side-foot">
        <StorageMeter usagePct={usagePct} low={storageLow} />
      </div>
    </aside>
  );
};
