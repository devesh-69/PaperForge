import React from 'react';
import type { SubjectBlock } from '../../types';

interface Props {
  blocks: SubjectBlock[];
}

const FIELD_COLUMNS = [
  { key: 'subject',      label: 'Subject' },
  { key: 'topic',        label: 'Topic' },
  { key: 'tags',         label: 'Tags' },
  { key: 'questionType', label: 'Q Type' },
  { key: 'correctMarks', label: '+Marks' },
  { key: 'negativeMarks',label: '-Marks' },
  { key: 'difficulty',   label: 'Difficulty' },
] as const;

export const FieldLockPreview: React.FC<Props> = ({ blocks }) => {
  if (blocks.length === 0) {
    return (
      <p className="text-muted small text-center py-3">
        Add subject blocks to see the lock preview.
      </p>
    );
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table className="lock-preview-table">
        <thead>
          <tr>
            <th>Block</th>
            <th>Q# Range</th>
            {FIELD_COLUMNS.map((col) => (
              <th key={col.key}>{col.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {blocks.map((block, idx) => {
            const isLocked = {
              subject:       true,               // always set per block
              topic:         !!block.topic,
              tags:          (block.tags ?? []).length > 0,
              questionType:  !!block.questionType,
              correctMarks:  block.correctMarks !== undefined,
              negativeMarks: block.negativeMarks !== undefined,
              difficulty:    !!block.difficulty,
            };

            return (
              <tr key={block.id}>
                <td>
                  <span className="block-number" style={{ width: 22, height: 22, fontSize: '0.7rem' }}>
                    {idx + 1}
                  </span>
                </td>
                <td className="font-mono" style={{ fontSize: '0.78rem', fontWeight: 600 }}>
                  Q{block.startQ}–Q{block.endQ}
                </td>
                {FIELD_COLUMNS.map((col) => {
                  const locked = isLocked[col.key];
                  return (
                    <td key={col.key} className={locked ? 'cell-locked' : 'cell-open'}>
                      {locked ? (
                        <span className="badge-locked">
                          <i className="bi bi-lock-fill me-1" style={{ fontSize: '0.6rem' }}></i>
                          Locked
                        </span>
                      ) : (
                        <span className="badge-open">
                          <i className="bi bi-pencil me-1" style={{ fontSize: '0.6rem' }}></i>
                          Editable
                        </span>
                      )}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="text-muted mt-2" style={{ fontSize: '0.75rem' }}>
        <i className="bi bi-info-circle me-1"></i>
        <strong>Locked</strong> fields are pre-filled from the template and disabled during question entry.
        <strong> Editable</strong> fields must be filled per question.
      </p>
    </div>
  );
};
