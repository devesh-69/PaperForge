import React from 'react';

interface Props {
  title: string;
  icon: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
}

/** A toolbar button that keeps the editor's selection (acts on mouse-down). */
export const ToolbarButton: React.FC<Props> = ({ title, icon, active = false, disabled = false, onClick }) => (
  <button
    type="button"
    className={`rich-tool-btn ${active ? 'active' : ''}`}
    title={title}
    aria-label={title}
    aria-pressed={active}
    disabled={disabled}
    onMouseDown={(e) => { e.preventDefault(); if (!disabled) onClick(); }}
    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (!disabled) onClick(); } }}
  >
    <i className={`bi ${icon}`}></i>
  </button>
);
