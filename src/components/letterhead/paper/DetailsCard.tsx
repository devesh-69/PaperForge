import React from 'react';
import { resolveFileName } from '../../../letterhead/filename';
import type { Letterhead, PaperDoc } from '../../../letterhead/types';
import { FormCard } from '../FormCard';
import { DetailInput } from './DetailInput';

interface Props {
  lh: Letterhead;
  doc: PaperDoc;
  /** the {Token} names used on the letterhead */
  tokens: string[];
  update: (fn: (d: PaperDoc) => PaperDoc) => void;
}

/** Document name, the {Token} values and the details-table fields. */
export const DetailsCard: React.FC<Props> = ({ lh, doc, tokens, update }) => (
  <FormCard icon="bi-pencil-square" title="Details">
    <div>
      <label className="lh-fill-label" htmlFor="pd-title">File name (leave empty for automatic)</label>
      <input
        id="pd-title"
        className="form-control"
        placeholder={resolveFileName(lh, { ...doc, title: '' })}
        value={doc.title}
        onChange={(e) => update((d) => ({ ...d, title: e.target.value }))}
      />
    </div>

    {tokens.length > 0 && (
      <div className="row g-3">
        {tokens.map((t) => (
          <div key={t} className="col-sm-6">
            <label className="lh-fill-label" htmlFor={`tok-${t}`}>{t}</label>
            <input
              id={`tok-${t}`}
              className="form-control"
              value={doc.fields[t] ?? ''}
              onChange={(e) => update((d) => ({ ...d, fields: { ...d.fields, [t]: e.target.value } }))}
            />
          </div>
        ))}
      </div>
    )}

    {lh.detailFields.length > 0 && (
      <div className="row g-3">
        {lh.detailFields.map((f) => (
          <DetailInput
            key={f.id}
            field={f}
            value={doc.details[f.id] ?? ''}
            onChange={(v) => update((d) => ({ ...d, details: { ...d.details, [f.id]: v } }))}
          />
        ))}
      </div>
    )}
  </FormCard>
);
