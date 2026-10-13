import React from 'react';
import { FONT_OPTIONS } from '../../../letterhead/defaults';
import { FormCard } from '../FormCard';
import { ColorField, NumField } from '../fields';
import type { CardProps } from './cardProps';
import { PaperBodyOptions } from './PaperBodyOptions';

export const BodyCard: React.FC<CardProps> = (props) => {
  const { lh, set } = props;
  return (
    <FormCard icon="bi-body-text" title="Body text">
      <div className="row g-2 align-items-end">
        <div className="col-sm-4">
          <label className="lh-fill-label" htmlFor="lh-bfont">Font</label>
          <select id="lh-bfont" className="form-select form-select-sm" value={lh.body.fontFamily} onChange={(e) => set({ body: { ...lh.body, fontFamily: e.target.value } })}>
            {FONT_OPTIONS.map((f) => <option key={f.label} value={f.label}>{f.label}</option>)}
          </select>
        </div>
        <div className="col-sm-4">
          <NumField label="Text size" value={lh.body.textSizePt} min={6} max={48} step={0.5} suffix="pt" onChange={(n) => set({ body: { ...lh.body, textSizePt: n } })} />
        </div>
        {lh.kind === 'paper' && (
          <div className="col-sm-4">
            <NumField label="Question size" value={lh.body.questionSizePt} min={6} max={48} step={0.5} suffix="pt" onChange={(n) => set({ body: { ...lh.body, questionSizePt: n } })} />
          </div>
        )}
      </div>
      <ColorField label="Body text colour" value={lh.body.color} palette={lh.palette} against="#ffffff" onChange={(c) => set({ body: { ...lh.body, color: c } })} />
      {lh.kind === 'paper' && <PaperBodyOptions {...props} />}
    </FormCard>
  );
};
