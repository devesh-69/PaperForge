import React from 'react';
import { Link } from 'react-router-dom';
import { useRecentActivity } from '../../hooks/useRecentActivity';
import { formatRelative } from '../../utils/format';

export const RecentActivity: React.FC = () => {
  const items = useRecentActivity();
  return (
    <section className="card" aria-labelledby="recent-heading">
      <div className="card-head-bar">
        <i className="bi bi-clock-history text-orange"></i>
        <h2 id="recent-heading">Continue where you left off</h2>
      </div>
      {items === undefined ? (
        <div className="p-4 text-center"><div className="spinner-border spinner-border-sm text-secondary" role="status"></div></div>
      ) : items.length === 0 ? (
        <p className="text-muted small p-4 mb-0">Nothing yet. Start with a template or a letterhead from above.</p>
      ) : (
        <ul className="activity-list">
          {items.map((it) => (
            <li key={it.id}>
              <span className="icon-chip"><i className={`bi ${it.icon}`}></i></span>
              <div className="flex-grow-1 min-w-0">
                <div className="fw-600 text-truncate">{it.title}</div>
                <div className="small text-muted">{it.kind}{it.detail ? ` · ${it.detail}` : ''}</div>
              </div>
              <span className="small text-muted d-none d-sm-inline">{formatRelative(it.when)}</span>
              <Link to={it.to} className="btn-icon text-decoration-none">Open</Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};
