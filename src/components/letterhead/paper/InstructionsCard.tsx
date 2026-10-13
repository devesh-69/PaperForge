import React from 'react';
import type { Letterhead, PaperDoc } from '../../../letterhead/types';
import { sanitizeMarks } from '../../../utils/numberInput';
import { FormCard } from '../FormCard';

interface Props {
  lh: Letterhead;
  doc: PaperDoc;
  update: (fn: (d: PaperDoc) => PaperDoc) => void;
}

export const InstructionsCard: React.FC<Props> = ({ lh, doc, update }) => (
  <FormCard icon="bi-list-ul" title={lh.instructionsHeading.replace(/\s*[-–:]\s*$/, '') || 'Instructions'}>
    {doc.instructions.map((s, i) => (
      <div key={i} className="d-flex gap-2">
        <textarea
          className="form-control"
          rows={1}
          aria-label={`Instruction ${i + 1}`}
          value={s}
          onChange={(e) => update((d) => ({ ...d, instructions: d.instructions.map((x, j) => (j === i ? e.target.value : x)) }))}
        />
        <button
          type="button"
          className="btn-icon danger"
          aria-label="Remove instruction"
          onClick={() => update((d) => ({ ...d, instructions: d.instructions.filter((_, j) => j !== i) }))}
        >
          <i className="bi bi-trash3"></i>
        </button>
      </div>
    ))}
    <div className="d-flex flex-wrap gap-3 align-items-end">
      <button type="button" className="btn-outline-black" onClick={() => update((d) => ({ ...d, instructions: [...d.instructions, ''] }))}>
        <i className="bi bi-plus-lg"></i>Add instruction
      </button>
      {lh.maxMarks.enabled && (
        <div className="lh-narrow-field">
          <label className="lh-fill-label" htmlFor="pd-max">{lh.maxMarks.label}</label>
          <input id="pd-max" className="form-control" inputMode="decimal" value={doc.maxMarks} onChange={(e) => update((d) => ({ ...d, maxMarks: sanitizeMarks(e.target.value) }))} />
        </div>
      )}
    </div>
  </FormCard>
);
