import React from 'react';
import { newDetailField } from '../../../letterhead/defaults';
import type { DetailField } from '../../../letterhead/types';
import { moveItem } from '../../../utils/arrays';
import { FormCard } from '../FormCard';
import type { CardProps } from './cardProps';

export const DetailFieldsCard: React.FC<CardProps> = ({ lh, set }) => {
  const update = (id: string, patch: Partial<DetailField>) =>
    set({ detailFields: lh.detailFields.map((f) => (f.id === id ? { ...f, ...patch } : f)) });

  return (
    <FormCard
      icon="bi-ui-checks"
      title="Details table"
      hint="Fields shown in a two-column table under the header (e.g. Subject, Date). You fill them in for every document."
    >
      {lh.detailFields.length === 0 && <div className="text-muted small">No detail fields.</div>}
      {lh.detailFields.map((f, i) => (
        <div key={f.id} className="d-flex flex-wrap gap-2 align-items-center">
          <input
            className="form-control form-control-sm flex-grow-1 w-auto"
            aria-label={`Field ${i + 1} label`}
            value={f.label}
            onChange={(e) => update(f.id, { label: e.target.value })}
          />
          <select
            className="form-select form-select-sm w-auto"
            aria-label={`Field ${i + 1} type`}
            value={f.kind}
            onChange={(e) => update(f.id, { kind: e.target.value as DetailField['kind'] })}
          >
            <option value="text">Text</option>
            <option value="date">Date</option>
            <option value="timeRange">Time from – to</option>
          </select>
          <button type="button" className="btn-icon" aria-label="Move up" disabled={i === 0} onClick={() => set({ detailFields: moveItem(lh.detailFields, i, -1) })}><i className="bi bi-arrow-up"></i></button>
          <button type="button" className="btn-icon" aria-label="Move down" disabled={i === lh.detailFields.length - 1} onClick={() => set({ detailFields: moveItem(lh.detailFields, i, 1) })}><i className="bi bi-arrow-down"></i></button>
          <button type="button" className="btn-icon danger" aria-label="Remove field" onClick={() => set({ detailFields: lh.detailFields.filter((x) => x.id !== f.id) })}><i className="bi bi-trash3"></i></button>
        </div>
      ))}
      <div>
        <button type="button" className="btn-outline-black" onClick={() => set({ detailFields: [...lh.detailFields, newDetailField()] })}>
          <i className="bi bi-plus-lg"></i>Add field
        </button>
      </div>
    </FormCard>
  );
};
