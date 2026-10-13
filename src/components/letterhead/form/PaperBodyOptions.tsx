import React from 'react';
import { ColorField } from '../fields';
import type { CardProps } from './cardProps';

/** Exam-paper only settings: rule, instructions heading / defaults, max marks and last-line (Viva). */
export const PaperBodyOptions: React.FC<CardProps> = ({ lh, set }) => (
  <>
    <div>
      <div className="form-check mb-2">
        <input id="lh-rule" className="form-check-input" type="checkbox" checked={lh.body.rule} onChange={(e) => set({ body: { ...lh.body, rule: e.target.checked } })} />
        <label className="form-check-label" htmlFor="lh-rule">Line between the instructions and the questions</label>
      </div>
      {lh.body.rule && <ColorField label="Line colour" value={lh.body.ruleColor} palette={lh.palette} onChange={(c) => set({ body: { ...lh.body, ruleColor: c } })} />}
    </div>

    <div>
      <label className="lh-fill-label" htmlFor="lh-ih">Instructions heading</label>
      <input id="lh-ih" className="form-control form-control-sm" value={lh.instructionsHeading} onChange={(e) => set({ instructionsHeading: e.target.value })} />
    </div>

    <div>
      <div className="lh-fill-label">Default instructions (bullets; editable on every document)</div>
      <div className="d-grid gap-2">
        {lh.defaultInstructions.map((s, i) => (
          <div key={i} className="d-flex gap-2">
            <textarea
              className="form-control form-control-sm"
              rows={1}
              aria-label={`Instruction ${i + 1}`}
              value={s}
              onChange={(e) => set({ defaultInstructions: lh.defaultInstructions.map((x, j) => (j === i ? e.target.value : x)) })}
            />
            <button type="button" className="btn-icon danger" aria-label="Remove instruction" onClick={() => set({ defaultInstructions: lh.defaultInstructions.filter((_, j) => j !== i) })}>
              <i className="bi bi-trash3"></i>
            </button>
          </div>
        ))}
        <div>
          <button type="button" className="btn-outline-black" onClick={() => set({ defaultInstructions: [...lh.defaultInstructions, ''] })}>
            <i className="bi bi-plus-lg"></i>Add instruction
          </button>
        </div>
      </div>
    </div>

    <div className="d-flex flex-wrap gap-4">
      <div>
        <div className="form-check mb-1">
          <input id="lh-max" className="form-check-input" type="checkbox" checked={lh.maxMarks.enabled} onChange={(e) => set({ maxMarks: { ...lh.maxMarks, enabled: e.target.checked } })} />
          <label className="form-check-label" htmlFor="lh-max">Last instruction shows maximum marks</label>
        </div>
        {lh.maxMarks.enabled && <input className="form-control form-control-sm" aria-label="Maximum marks label" value={lh.maxMarks.label} onChange={(e) => set({ maxMarks: { ...lh.maxMarks, label: e.target.value } })} />}
      </div>
      <div>
        <div className="form-check mb-1">
          <input id="lh-viva" className="form-check-input" type="checkbox" checked={lh.viva.enabled} onChange={(e) => set({ viva: { ...lh.viva, enabled: e.target.checked } })} />
          <label className="form-check-label" htmlFor="lh-viva">Add a line after the last question (e.g. Viva)</label>
        </div>
        {lh.viva.enabled && <input className="form-control form-control-sm" aria-label="Last line label" value={lh.viva.label} onChange={(e) => set({ viva: { ...lh.viva, label: e.target.value } })} />}
      </div>
    </div>
  </>
);
