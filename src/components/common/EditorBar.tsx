import React from 'react';

interface Props {
  title: string;
  /** small line under the title (e.g. which design it uses) */
  subtitle?: React.ReactNode;
  onBack: () => void;
  backLabel: string;
  /** save state / unsaved marker, shown next to the title */
  status?: React.ReactNode;
  /** buttons pinned to the right */
  children?: React.ReactNode;
}

/** The sticky bar under the top bar on editor pages: back, title, status and the main actions. */
export const EditorBar: React.FC<Props> = ({ title, subtitle, onBack, backLabel, status, children }) => (
  <div className="editor-bar">
    <button type="button" className="btn-icon" onClick={onBack} title={backLabel} aria-label={backLabel}>
      <i className="bi bi-arrow-left"></i>
    </button>
    <div className="min-w-0">
      <h1 className="text-truncate">{title}</h1>
      {subtitle && <div className="editor-sub">{subtitle}</div>}
    </div>
    {status && <div className="save-state">{status}</div>}
    <div className="d-flex align-items-center gap-2 flex-wrap ms-auto">{children}</div>
  </div>
);
