import React from 'react';

interface Props {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  /** shows a back arrow when given */
  onBack?: () => void;
  backLabel?: string;
  /** content pinned to the right (status, buttons) */
  right?: React.ReactNode;
}

/** Page title row with an optional back button. */
export const PageHeader: React.FC<Props> = ({ title, subtitle, onBack, backLabel = 'Back', right }) => (
  <div className="page-header">
    <div className="d-flex align-items-center gap-3 flex-wrap">
      {onBack && (
        <button type="button" className="btn-icon" onClick={onBack} title={backLabel} aria-label={backLabel}>
          <i className="bi bi-arrow-left"></i>
        </button>
      )}
      <div>
        <h1 className="mb-0">{title}</h1>
        {subtitle && <p className="text-muted small mb-0 mt-1">{subtitle}</p>}
      </div>
      {right && <div className="ms-auto">{right}</div>}
    </div>
  </div>
);
