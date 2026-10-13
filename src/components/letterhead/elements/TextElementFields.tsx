import React from 'react';
import { FONT_OPTIONS } from '../../../letterhead/defaults';
import type { LetterheadElement, TextElement, TextStyle } from '../../../letterhead/types';
import { ColorField, NumField, SegmentedControl } from '../fields';
import { ALIGN_OPTIONS } from './alignOptions';

interface Props {
  element: TextElement;
  palette: string[];
  /** background the text sits on, for the contrast warning */
  background: string;
  onChange: (el: LetterheadElement) => void;
}

export const TextElementFields: React.FC<Props> = ({ element: el, palette, background, onChange }) => {
  const s = el.style;
  const setStyle = (patch: Partial<TextStyle>) => onChange({ ...el, style: { ...s, ...patch } });

  const toggle = (key: 'bold' | 'italic' | 'underline', label: React.ReactNode, title: string) => (
    <button
      type="button"
      className={`btn btn-sm ${s[key] ? 'btn-dark' : 'btn-outline-secondary'}`}
      aria-pressed={s[key]}
      title={title}
      onClick={() => setStyle({ [key]: !s[key] })}
    >
      {label}
    </button>
  );

  return (
    <>
      <div>
        <label className="lh-fill-label" htmlFor={`txt-${el.id}`}>Text</label>
        <textarea
          id={`txt-${el.id}`}
          className="form-control form-control-sm"
          rows={2}
          value={el.text}
          onChange={(e) => onChange({ ...el, text: e.target.value })}
        />
        <div className="form-text">
          Use <code>{'{Month}'}</code>, <code>{'{Year}'}</code> … for parts you fill in on every document. A new line starts a new paragraph.
        </div>
      </div>
      <div className="row g-2 align-items-end">
        <div className="col-sm-6">
          <label className="lh-fill-label" htmlFor={`font-${el.id}`}>Font</label>
          <select
            id={`font-${el.id}`}
            className="form-select form-select-sm"
            value={s.fontFamily}
            onChange={(e) => setStyle({ fontFamily: e.target.value })}
          >
            {FONT_OPTIONS.map((f) => <option key={f.label} value={f.label}>{f.label}</option>)}
          </select>
        </div>
        <div className="col-sm-3">
          <NumField label="Size" value={s.sizePt} min={6} max={96} step={0.5} suffix="pt" onChange={(n) => setStyle({ sizePt: n })} />
        </div>
        <div className="col-sm-3">
          <div className="lh-fill-label">Style</div>
          <div className="btn-group">
            {toggle('bold', <b>B</b>, 'Bold')}
            {toggle('italic', <i>I</i>, 'Italic')}
            {toggle('underline', <u>U</u>, 'Underline')}
          </div>
        </div>
      </div>
      <div className="row g-2 align-items-start">
        <div className="col-sm-4">
          <SegmentedControl label="Align" value={s.align} options={ALIGN_OPTIONS} onChange={(v) => setStyle({ align: v })} />
        </div>
        <div className="col-sm-4">
          <NumField label="Space before" value={s.spaceBeforePt} min={0} max={100} suffix="pt" onChange={(n) => setStyle({ spaceBeforePt: n })} />
        </div>
        <div className="col-sm-4">
          <NumField label="Space after" value={s.spaceAfterPt} min={0} max={100} suffix="pt" onChange={(n) => setStyle({ spaceAfterPt: n })} />
        </div>
      </div>
      <ColorField label="Text colour" value={s.color} palette={palette} against={background} onChange={(c) => setStyle({ color: c })} />
    </>
  );
};
