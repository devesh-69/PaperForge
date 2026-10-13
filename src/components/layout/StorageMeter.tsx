import React from 'react';
import { Link } from 'react-router-dom';

/** Browser storage usage, with a nudge to back up (everything lives on this computer). */
export const StorageMeter: React.FC<{ usagePct: number; low: boolean }> = ({ usagePct, low }) => (
  <div className="storage-meter" title={`Browser storage: ${usagePct.toFixed(1)}% used`}>
    <div className="d-flex align-items-center gap-2 small fw-600 mb-1">
      <i className="bi bi-hdd text-orange"></i>
      <span className="meter-text">Browser storage</span>
      <span className="ms-auto text-muted meter-text">{Math.max(usagePct, 0.1).toFixed(usagePct < 10 ? 1 : 0)}%</span>
    </div>
    <div className={`meter ${low ? 'warn' : ''}`} role="progressbar" aria-label="Browser storage used" aria-valuenow={Math.round(usagePct)} aria-valuemin={0} aria-valuemax={100}>
      <i style={{ width: `${Math.min(100, Math.max(usagePct, 1))}%` }}></i>
    </div>
    <p className="text-muted mt-2 mb-2 meter-text meter-hint">
      Everything is saved on this computer. Back up regularly.
    </p>
    <Link to="/backup" className="btn-icon w-100 justify-content-center meter-text text-decoration-none">Back up now</Link>
  </div>
);
