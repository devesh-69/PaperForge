import React from 'react';
import { fileNameFields, resolveFileName } from '../../../letterhead/filename';
import type { CardProps } from './cardProps';

/** The download file name pattern, with the available field names as one-click chips. */
export const FileNameField: React.FC<CardProps> = ({ lh, set }) => {
  const fields = fileNameFields(lh);
  const pattern = lh.fileNamePattern ?? '';
  const sample = resolveFileName({ ...lh, fileNamePattern: pattern }, {
    id: '', letterheadId: lh.id, kind: lh.kind, title: '', fields: {}, details: {}, instructions: [], maxMarks: '',
    questions: [], vivaMarks: '', letterBody: '', createdAt: '', updatedAt: '',
  });

  return (
    <div>
      <label className="form-label" htmlFor="lh-filename">Download file name</label>
      <input
        id="lh-filename"
        className="form-control"
        placeholder="e.g. {Subject Code} {Subject}"
        value={pattern}
        onChange={(e) => set({ fileNamePattern: e.target.value })}
      />
      <div className="form-text d-flex flex-wrap gap-1 align-items-center">
        <span>Add a field:</span>
        {fields.length === 0 && <span>none yet</span>}
        {fields.map((f) => (
          <button
            key={f}
            type="button"
            className="badge-tag lh-tag-btn"
            onClick={() => set({ fileNamePattern: `${pattern}${pattern && !pattern.endsWith(' ') ? ' ' : ''}{${f}}` })}
          >
            {`{${f}}`}
          </button>
        ))}
      </div>
      <div className="form-text">
        Becomes e.g. <strong>{sample === lh.name || !pattern.trim() ? 'the file name' : sample}</strong>. Leave empty to use the {lh.kind === 'paper' ? 'subject code and subject when the format has them, otherwise the format' : 'letterhead'} name. Used for both Word and PDF.
      </div>
    </div>
  );
};
