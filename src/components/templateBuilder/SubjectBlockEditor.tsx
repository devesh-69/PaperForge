import React from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { SubjectBlock } from '../../types';
import { QUESTION_TYPES, DIFFICULTIES } from '../../types';
import { TagInput } from './TagInput';

interface Props {
  blocks: SubjectBlock[];
  onChange: (blocks: SubjectBlock[]) => void;
  errors: Record<string, string>;
}



export const SubjectBlockEditor: React.FC<Props> = ({ blocks, onChange, errors }) => {
  const handleAdd = () => {
    const lastBlock = blocks[blocks.length - 1];
    const nextStart = lastBlock ? lastBlock.endQ + 1 : 1;
    onChange([
      ...blocks,
      {
        id: uuidv4(),
        startQ: nextStart,
        endQ: nextStart + 9,
        subject: '',
        topic: '',
        tags: [],
        questionType: undefined,
        correctMarks: undefined,
        negativeMarks: undefined,
        difficulty: undefined,
      },
    ]);
  };

  const handleRemove = (id: string) => {
    onChange(blocks.filter((b) => b.id !== id));
  };

  const handleFieldChange = (
    id: string,
    field: keyof SubjectBlock,
    value: string | number | string[] | undefined
  ) => {
    onChange(
      blocks.map((b) =>
        b.id === id ? { ...b, [field]: value } : b
      )
    );
  };

  return (
    <div>
      {blocks.length === 0 && (
        <div className="text-center py-4 text-secondary small mb-3">
          No subject blocks yet. Add one below.
        </div>
      )}

      {blocks.map((block, idx) => (
        <div key={block.id} className="block-card mb-3">
          <div className="block-card-header">
            <div className="d-flex align-items-center gap-2">
              <span className="block-number">{idx + 1}</span>
              <span className="fw-600 small text-secondary">
                {block.subject || 'Untitled Block'}
                {block.startQ && block.endQ
                  ? ` · Q${block.startQ}–Q${block.endQ}`
                  : ''}
              </span>
            </div>
            <button
              type="button"
              className="btn-icon danger"
              onClick={() => handleRemove(block.id)}
              title="Remove block"
              disabled={blocks.length === 1}
            >
              <i className="bi bi-trash"></i>
            </button>
          </div>

          <div className="block-card-body">
            <div className="row g-3">
              {/* Q# Range */}
              <div className="col-6 col-md-3">
                <label className="form-label">Start Q#</label>
                <input
                  type="number"
                  className={`form-control ${errors[`block_${block.id}_startQ`] ? 'is-invalid' : ''}`}
                  min={1}
                  value={block.startQ}
                  onChange={(e) => handleFieldChange(block.id, 'startQ', e.target.value === '' ? ('' as any) : parseInt(e.target.value))}
                />
                {errors[`block_${block.id}_startQ`] && (
                  <div className="invalid-feedback">{errors[`block_${block.id}_startQ`]}</div>
                )}
              </div>
              <div className="col-6 col-md-3">
                <label className="form-label">End Q#</label>
                <input
                  type="number"
                  className={`form-control ${errors[`block_${block.id}_endQ`] ? 'is-invalid' : ''}`}
                  min={1}
                  value={block.endQ}
                  onChange={(e) => handleFieldChange(block.id, 'endQ', e.target.value === '' ? ('' as any) : parseInt(e.target.value))}
                />
                {errors[`block_${block.id}_endQ`] && (
                  <div className="invalid-feedback">{errors[`block_${block.id}_endQ`]}</div>
                )}
              </div>

              {/* Subject */}
              <div className="col-12 col-md-6">
                <label className="form-label">
                  Subject <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  className={`form-control ${errors[`block_${block.id}_subject`] ? 'is-invalid' : ''}`}
                  placeholder="e.g. Mathematics"
                  value={block.subject}
                  onChange={(e) => handleFieldChange(block.id, 'subject', e.target.value)}
                />
                {errors[`block_${block.id}_subject`] && (
                  <div className="invalid-feedback">{errors[`block_${block.id}_subject`]}</div>
                )}
              </div>

              {/* Topic (optional – if blank = unlocked per-question) */}
              <div className="col-12 col-md-6">
                <label className="form-label">
                  Topic <span className="text-muted fw-normal">(optional — blank = editable per question)</span>
                </label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Algebra"
                  value={block.topic ?? ''}
                  onChange={(e) =>
                    handleFieldChange(block.id, 'topic', e.target.value || undefined)
                  }
                />
              </div>

              {/* Per-block tags */}
              <div className="col-12 col-md-6">
                <label className="form-label mb-1">
                  Block Tags <span className="text-muted fw-normal">(optional)</span>
                </label>
                <TagInput
                  tags={block.tags ?? []}
                  onChange={(newTags) => handleFieldChange(block.id, 'tags', newTags)}
                />
              </div>

              {/* Question Type (lock) */}
              <div className="col-12 col-md-4">
                <label className="form-label">
                  Question Type <span className="text-muted fw-normal">(optional — locks for block)</span>
                </label>
                <select
                  className="form-select"
                  value={block.questionType ?? ''}
                  onChange={(e) =>
                    handleFieldChange(
                      block.id,
                      'questionType',
                      e.target.value || undefined
                    )
                  }
                >
                  <option value="">— Not locked —</option>
                  {QUESTION_TYPES.map((qt) => (
                    <option key={qt} value={qt}>{qt}</option>
                  ))}
                </select>
              </div>

              {/* Correct Marks (lock) */}
              <div className="col-6 col-md-4">
                <label className="form-label">
                  Correct Marks <span className="text-muted fw-normal">(optional)</span>
                </label>
                <input
                  type="number"
                  step="0.5"
                  className="form-control"
                  placeholder="e.g. 4"
                  value={block.correctMarks ?? ''}
                  onChange={(e) =>
                    handleFieldChange(
                      block.id,
                      'correctMarks',
                      e.target.value !== '' ? parseFloat(e.target.value) : undefined
                    )
                  }
                />
              </div>

              {/* Negative Marks (lock) */}
              <div className="col-6 col-md-4">
                <label className="form-label">
                  Negative Marks <span className="text-muted fw-normal">(optional)</span>
                </label>
                <input
                  type="number"
                  step="0.5"
                  className="form-control"
                  placeholder="e.g. -1"
                  value={block.negativeMarks ?? ''}
                  onChange={(e) =>
                    handleFieldChange(
                      block.id,
                      'negativeMarks',
                      e.target.value !== '' ? parseFloat(e.target.value) : undefined
                    )
                  }
                />
              </div>

              {/* Difficulty (lock) */}
              <div className="col-12 col-md-4">
                <label className="form-label">
                  Difficulty <span className="text-muted fw-normal">(optional)</span>
                </label>
                <select
                  className="form-select"
                  value={block.difficulty ?? ''}
                  onChange={(e) =>
                    handleFieldChange(
                      block.id,
                      'difficulty',
                      e.target.value || undefined
                    )
                  }
                >
                  <option value="">— Not locked —</option>
                  {DIFFICULTIES.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>
      ))}

      <button type="button" className="btn-icon w-100 py-2 mt-1" onClick={handleAdd}>
        <i className="bi bi-plus-lg"></i>
        Add Subject Block
      </button>
    </div>
  );
};
