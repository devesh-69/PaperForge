import React, { useCallback, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDismissable } from '../../hooks/useDismissable';
import { CREATE_ACTIONS } from './navConfig';

/** The "+ New" dropdown in the top bar: one place to start anything. */
export const NewMenu: React.FC = () => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const close = useCallback(() => setOpen(false), []);
  useDismissable(open, close, ref);

  return (
    <div className="pf-menu-wrap" ref={ref}>
      <button type="button" className="btn-orange" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <i className="bi bi-plus-lg"></i>
        <span className="d-none d-sm-inline">New</span>
        <i className="bi bi-chevron-down small"></i>
      </button>
      {open && (
        <div className="pf-menu" role="menu">
          {CREATE_ACTIONS.map((a, i) => (
            <React.Fragment key={a.to}>
              {i === 2 && <hr />}
              <button type="button" role="menuitem" onClick={() => { close(); navigate(a.to); }}>
                <i className={`bi ${a.icon}`}></i>
                <span><b>{a.label}</b><small>{a.hint}</small></span>
              </button>
            </React.Fragment>
          ))}
        </div>
      )}
    </div>
  );
};
