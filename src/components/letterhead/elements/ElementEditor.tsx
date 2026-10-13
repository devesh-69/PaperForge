import React from 'react';
import type { LetterheadElement } from '../../../letterhead/types';
import { DividerElementFields } from './DividerElementFields';
import { LogoElementFields } from './LogoElementFields';
import { TextElementFields } from './TextElementFields';

const ICON: Record<LetterheadElement['type'], string> = {
  logo: 'bi-image',
  text: 'bi-fonts',
  divider: 'bi-dash-lg',
};

function summary(el: LetterheadElement): string {
  if (el.type === 'logo') {
    if (!el.assetId) return 'No image yet';
    const where = { above: 'own row', left: 'left of heading', right: 'right of heading' }[el.placement ?? 'above'];
    return `${el.widthMm} mm wide, ${where}`;
  }
  if (el.type === 'divider') return `${el.thicknessPt} pt ${el.lineStyle}`;
  return el.text.replace(/\s+/g, ' ').trim() || '(empty)';
}

interface Props {
  element: LetterheadElement;
  palette: string[];
  /** background behind the header, for contrast warnings */
  background: string;
  open: boolean;
  isFirst: boolean;
  isLast: boolean;
  onToggle: () => void;
  onChange: (el: LetterheadElement) => void;
  onMove: (dir: -1 | 1) => void;
  onDuplicate: () => void;
  onRemove: () => void;
}

/** One collapsible row of the "Header elements" list. */
export const ElementEditor: React.FC<Props> = ({
  element, palette, background, open, isFirst, isLast, onToggle, onChange, onMove, onDuplicate, onRemove,
}) => (
  <div className="lh-element">
    <div
      className="lh-element-head"
      role="button"
      tabIndex={0}
      aria-expanded={open}
      onClick={onToggle}
      onKeyDown={(e) => {
        if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); onToggle(); }
      }}
    >
      <span className="lh-type"><i className={`bi ${ICON[element.type]}`}></i></span>
      <div className="flex-grow-1 text-truncate">
        <div className="lh-element-title">{element.label || 'Untitled'}</div>
        <div className="lh-element-sub text-truncate">{summary(element)}</div>
      </div>
      <div className="d-flex gap-1" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="btn-icon" title="Move up" aria-label="Move up" disabled={isFirst} onClick={() => onMove(-1)}><i className="bi bi-arrow-up"></i></button>
        <button type="button" className="btn-icon" title="Move down" aria-label="Move down" disabled={isLast} onClick={() => onMove(1)}><i className="bi bi-arrow-down"></i></button>
        <button type="button" className="btn-icon" title="Duplicate" aria-label="Duplicate" onClick={onDuplicate}><i className="bi bi-copy"></i></button>
        <button type="button" className="btn-icon danger" title="Remove" aria-label="Remove" onClick={onRemove}><i className="bi bi-trash3"></i></button>
      </div>
    </div>
    {open && (
      <div className="lh-element-body">
        <div>
          <label className="lh-fill-label" htmlFor={`lbl-${element.id}`}>Name (only shown here)</label>
          <input
            id={`lbl-${element.id}`}
            className="form-control form-control-sm"
            value={element.label}
            onChange={(e) => onChange({ ...element, label: e.target.value })}
          />
        </div>
        {element.type === 'text' && <TextElementFields element={element} palette={palette} background={background} onChange={onChange} />}
        {element.type === 'logo' && <LogoElementFields element={element} onChange={onChange} />}
        {element.type === 'divider' && <DividerElementFields element={element} palette={palette} background={background} onChange={onChange} />}
      </div>
    )}
  </div>
);
