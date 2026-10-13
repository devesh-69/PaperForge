import React from 'react';

interface Props {
  icon: string;
  title: string;
  hint: string;
  actionLabel?: string;
  onAction?: () => void;
}

/** Friendly empty state used by the design and document lists. */
export const EmptyState: React.FC<Props> = ({ icon, title, hint, actionLabel, onAction }) => (
  <div className="card p-5 text-center">
    <i className={`bi ${icon} text-muted mb-3 lh-empty-icon`}></i>
    <h5 className="text-muted">{title}</h5>
    <p className="text-muted small mb-3">{hint}</p>
    {actionLabel && onAction && (
      <div>
        <button className="btn-orange" onClick={onAction}><i className="bi bi-plus-lg"></i>{actionLabel}</button>
      </div>
    )}
  </div>
);