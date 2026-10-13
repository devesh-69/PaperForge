import React, { useEffect, useId, useRef, useState } from 'react';

export type DownloadFormat = 'docx' | 'pdf';

interface Props {
  busy: boolean;
  /** icon-only main button, for table rows */
  compact?: boolean;
  onDownload: (format: DownloadFormat) => void;
}

const HOVER_CLOSE_DELAY_MS = 180;
const MENU_HEIGHT_PX = 150;

/** Split button: the main part downloads Word; the arrow (click or hover) offers PDF too. */
export const DownloadMenu: React.FC<Props> = ({ busy, compact = false, onDownload }) => {
  const [open, setOpen] = useState(false);
  // open upwards when there is not enough room below the button (it sits near the bottom of the page)
  const [openUp, setOpenUp] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<number | undefined>(undefined);
  const menuId = useId();

  // click outside / Escape closes
  useEffect(() => {
    if (!open) return;
    const r = rootRef.current?.getBoundingClientRect();
    if (r) setOpenUp(window.innerHeight - r.bottom < MENU_HEIGHT_PX && r.top > MENU_HEIGHT_PX);
    const onDown = (e: MouseEvent) => { if (!rootRef.current?.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const pick = (f: DownloadFormat) => {
    setOpen(false);
    onDownload(f);
  };

  return (
    <div
      ref={rootRef}
      className={`split-btn ${compact ? 'compact' : ''}`}
      onPointerEnter={(e) => {
        if (e.pointerType !== 'mouse') return;
        window.clearTimeout(closeTimer.current);
        setOpen(true);
      }}
      onPointerLeave={(e) => {
        if (e.pointerType !== 'mouse') return;
        closeTimer.current = window.setTimeout(() => setOpen(false), HOVER_CLOSE_DELAY_MS);
      }}
    >
      <button type="button" className="btn-orange split-btn-main" disabled={busy} title="Download .docx" aria-label="Download .docx" onClick={() => pick('docx')}>
        {busy ? <span className="spinner-border spinner-border-sm" role="status"></span> : <i className="bi bi-download"></i>}
        {!compact && 'Download .docx'}
      </button>
      <button
        type="button"
        className="btn-orange split-btn-caret"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label="More download formats"
        disabled={busy}
        onClick={() => setOpen((o) => !o)}
      >
        <i className={`bi ${open ? 'bi-chevron-up' : 'bi-chevron-down'}`}></i>
      </button>

      {open && (
        <div className={`split-btn-menu-wrap ${openUp ? 'up' : ''}`}>
          <div id={menuId} className="split-btn-menu" role="menu">
            <button type="button" role="menuitem" className="split-btn-item" onClick={() => pick('docx')}>
              <i className="bi bi-file-earmark-word"></i>
              <span>
                <div className="item-title">Word document (.docx)</div>
                <div className="item-hint">Downloads straight away, editable in Word</div>
              </span>
            </button>
            <button type="button" role="menuitem" className="split-btn-item" onClick={() => pick('pdf')}>
              <i className="bi bi-file-earmark-pdf"></i>
              <span>
                <div className="item-title">PDF</div>
                <div className="item-hint">Downloads straight away, ready to print or share</div>
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
