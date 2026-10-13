import React from 'react';
import type { DividerElement, LetterheadElement } from '../../../letterhead/types';
import { ColorField, NumField, SegmentedControl } from '../fields';

interface Props {
  element: DividerElement;
  palette: string[];
  background: string;
  onChange: (el: LetterheadElement) => void;
}

export const DividerElementFields: React.FC<Props> = ({ element: el, palette, background, onChange }) => (
  <>
    <div className="row g-2 align-items-start">
      <div className="col-sm-4"><NumField label="Thickness" value={el.thicknessPt} min={0.25} max={12} step={0.25} suffix="pt" onChange={(n) => onChange({ ...el, thicknessPt: n })} /></div>
      <div className="col-sm-4"><NumField label="Space before" value={el.spaceBeforePt} min={0} max={100} suffix="pt" onChange={(n) => onChange({ ...el, spaceBeforePt: n })} /></div>
      <div className="col-sm-4"><NumField label="Space after" value={el.spaceAfterPt} min={0} max={100} suffix="pt" onChange={(n) => onChange({ ...el, spaceAfterPt: n })} /></div>
    </div>
    <SegmentedControl
      label="Line style"
      value={el.lineStyle}
      options={[
        { value: 'single', label: 'Solid' },
        { value: 'double', label: 'Double' },
        { value: 'dashed', label: 'Dashed' },
        { value: 'dotted', label: 'Dotted' },
      ]}
      onChange={(v) => onChange({ ...el, lineStyle: v })}
    />
    <ColorField label="Line colour" value={el.color} palette={palette} against={background} onChange={(c) => onChange({ ...el, color: c })} />
  </>
);
