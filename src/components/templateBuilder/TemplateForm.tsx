import React, { useState, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { Template, SubjectBlock } from '../../types';
import { SubjectBlockEditor } from './SubjectBlockEditor';
import { FieldLockPreview } from './FieldLockPreview';

interface Props {
  initial?: Template;
  onSave: (template: Template) => Promise<void>;
  onCancel: () => void;
}

interface FormErrors {
  name?: string;
  blocks?: string;
  [key: string]: string | undefined;
}

function validateBlocks(
  blocks: SubjectBlock[],
  maxQuestions: number | null,
  errors: FormErrors
): boolean {
  let valid = true;

  blocks.forEach((block) => {
    if (!block.subject.trim()) {
      errors[`block_${block.id}_subject`] = 'Subject is required for each block.';
      valid = false;
    }
    if (block.startQ > block.endQ) {
      errors[`block_${block.id}_startQ`] = 'Start Q# must be ≤ End Q#.';
      errors[`block_${block.id}_endQ`] = 'End Q# must be ≥ Start Q#.';
      valid = false;
    }
    if (maxQuestions !== null && block.endQ > maxQuestions) {
      errors[`block_${block.id}_endQ`] = `End Q# cannot exceed Max Questions (${maxQuestions}).`;
      valid = false;
    }
  });

  // Check overlapping blocks
  for (let i = 0; i < blocks.length; i++) {
    for (let j = i + 1; j < blocks.length; j++) {
      const a = blocks[i];
      const b = blocks[j];
      if (a.startQ <= b.endQ && b.startQ <= a.endQ) {
        errors[`block_${a.id}_startQ`] =
          `Block ${i + 1} overlaps with Block ${j + 1} (Q${b.startQ}–Q${b.endQ}).`;
        errors[`block_${b.id}_startQ`] =
          `Block ${j + 1} overlaps with Block ${i + 1} (Q${a.startQ}–Q${a.endQ}).`;
        valid = false;
      }
    }
  }

  return valid;
}

export const TemplateForm: React.FC<Props> = ({ initial, onSave, onCancel }) => {
  const isEdit = !!initial;

  const [name, setName] = useState(initial?.name ?? '');
  const [tagsInput, setTagsInput] = useState((initial?.tags ?? []).join(', '));
  const [maxQEnabled, setMaxQEnabled] = useState(initial?.maxQuestions !== null && initial?.maxQuestions !== undefined);
  const [maxQuestions, setMaxQuestions] = useState<number>(initial?.maxQuestions ?? 50);
  const [blocks, setBlocks] = useState<SubjectBlock[]>(
    initial?.subjectBlocks ?? []
  );
  const [errors, setErrors] = useState<FormErrors>({});
  const [saving, setSaving] = useState(false);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const newErrors: FormErrors = {};

      if (!name.trim()) {
        newErrors.name = 'Template name is required.';
      }
      if (blocks.length === 0) {
        newErrors.blocks = 'At least one subject block is required.';
      }

      const maxQ = maxQEnabled ? maxQuestions : null;
      const blocksValid = validateBlocks(blocks, maxQ, newErrors);

      setErrors(newErrors);
      if (Object.keys(newErrors).length > 0 || !blocksValid) return;

      const tags = tagsInput
        ? tagsInput.split(',').map((t) => t.trim()).filter(Boolean)
        : [];

      const now = new Date().toISOString();
      const template: Template = {
        id: initial?.id ?? uuidv4(),
        name: name.trim(),
        tags,
        createdAt: initial?.createdAt ?? now,
        updatedAt: now,
        maxQuestions: maxQEnabled ? maxQuestions : null,
        subjectBlocks: blocks,
      };

      try {
        setSaving(true);
        await onSave(template);
      } finally {
        setSaving(false);
      }
    },
    [name, tagsInput, maxQEnabled, maxQuestions, blocks, initial, onSave]
  );

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div className="row g-4">
        {/* ── Left column: form fields ─────────────────────────── */}
        <div className="col-lg-7">
          {/* Template metadata */}
          <div className="card mb-4">
            <div className="card-body p-4">
              <h5 className="fw-700 mb-3 d-flex align-items-center gap-2">
                <i className="bi bi-info-circle text-orange"></i>
                Template Details
              </h5>

              <div className="mb-3">
                <label className="form-label">
                  Template Name <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  className={`form-control ${errors.name ? 'is-invalid' : ''}`}
                  placeholder="e.g. JEE Main 2024 Mock Test"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
                {errors.name && <div className="invalid-feedback">{errors.name}</div>}
              </div>

              <div className="mb-3">
                <label className="form-label">
                  Tags <span className="text-muted fw-normal">(comma-separated)</span>
                </label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. JEE, Physics, Chemistry"
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                />
                <div className="form-text">
                  Tags help you find and filter templates later.
                </div>
              </div>

              <div className="mb-1">
                <label className="form-label d-block">Max Questions</label>
                <div className="d-flex align-items-center gap-3">
                  <div className="form-check form-switch mb-0">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      role="switch"
                      id="maxQSwitch"
                      checked={maxQEnabled}
                      onChange={(e) => setMaxQEnabled(e.target.checked)}
                    />
                    <label className="form-check-label" htmlFor="maxQSwitch">
                      {maxQEnabled ? 'Fixed limit' : 'Unlimited'}
                    </label>
                  </div>
                  {maxQEnabled && (
                    <input
                      type="number"
                      className="form-control"
                      style={{ width: 110 }}
                      min={1}
                      value={maxQuestions}
                      onChange={(e) =>
                        setMaxQuestions(e.target.value === '' ? ('' as any) : parseInt(e.target.value))
                      }
                    />
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Subject blocks */}
          <div className="card">
            <div className="card-body p-4">
              <h5 className="fw-700 mb-1 d-flex align-items-center gap-2">
                <i className="bi bi-layers text-orange"></i>
                Subject Blocks
              </h5>
              <p className="text-muted small mb-3">
                Define which question numbers belong to which subject.
                Optional fields set a locked default for all questions in that range.
              </p>
              {errors.blocks && (
                <div className="alert alert-danger py-2 px-3 mb-3" role="alert">
                  <i className="bi bi-exclamation-triangle-fill me-2"></i>
                  {errors.blocks}
                </div>
              )}
              <SubjectBlockEditor
                blocks={blocks}
                onChange={setBlocks}
                errors={Object.fromEntries(
                  Object.entries(errors).filter(
                    ([, v]) => v !== undefined
                  ) as [string, string][]
                )}
              />
            </div>
          </div>
        </div>

        {/* ── Right column: lock preview ───────────────────────── */}
        <div className="col-lg-5">
          <div className="card" style={{ position: 'sticky', top: 80 }}>
            <div className="card-body p-4">
              <h5 className="fw-700 mb-1 d-flex align-items-center gap-2">
                <i className="bi bi-eye text-orange"></i>
                Field Lock Preview
              </h5>
              <p className="text-muted small mb-3">
                Shows which columns will be locked (pre-filled from template)
                vs. editable per question.
              </p>
              <FieldLockPreview blocks={blocks} />
            </div>
          </div>
        </div>
      </div>

      {/* ── Action buttons ─────────────────────────────────────── */}
      <div className="d-flex justify-content-end gap-2 mt-4 pt-3 border-top">
        <button
          type="button"
          className="btn-outline-black"
          onClick={onCancel}
          disabled={saving}
        >
          <i className="bi bi-x-lg"></i>
          Cancel
        </button>
        <button type="submit" className="btn-orange" disabled={saving}>
          {saving ? (
            <>
              <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
              Saving…
            </>
          ) : (
            <>
              <i className="bi bi-floppy-fill"></i>
              {isEdit ? 'Save Changes' : 'Create Template'}
            </>
          )}
        </button>
      </div>
    </form>
  );
};
