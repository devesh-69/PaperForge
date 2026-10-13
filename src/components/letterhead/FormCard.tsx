import React from 'react';

interface Props {
  icon: string;
  title: string;
  hint?: string;
  children: React.ReactNode;
}

/** A titled card used for each section of the letterhead and document forms. */
export const FormCard: React.FC<Props> = ({ icon, title, hint, children }) => (
  <div className="card mb-4">
    <div className="card-body p-4">
      <h5 className="fw-700 mb-1 d-flex align-items-center gap-2">
        <i className={`bi ${icon} text-orange`}></i>
        {title}
      </h5>
      {hint ? <p className="text-muted small mb-3">{hint}</p> : <div className="mb-3" />}
      <div className="d-grid gap-3">{children}</div>
    </div>
  </div>
);
