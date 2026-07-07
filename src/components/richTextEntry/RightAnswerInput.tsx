import React from 'react';
import type { QuestionType, RichContent } from '../../types';

interface Props {
  questionType: QuestionType;
  options: RichContent[];
  value: string;
  onChange: (val: string) => void;
  disabled?: boolean;
}

/** Extract plain text from RichContent html for display in labels */
function plainText(rc: RichContent, fallback: string): string {
  const div = document.createElement('div');
  div.innerHTML = rc.html;
  const t = div.textContent?.trim();
  return t || fallback;
}

export const RightAnswerInput: React.FC<Props> = ({
  questionType,
  options,
  value,
  onChange,
  disabled,
}) => {
  if (questionType === 'NUMERICAL') {
    return (
      <div>
        <label className="form-label">
          Right Answer <span className="text-muted fw-normal small">(numeric value)</span>
        </label>
        <input
          type="number"
          className="form-control"
          style={{ maxWidth: 200 }}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          placeholder="e.g. 4"
        />
      </div>
    );
  }

  if (questionType === 'FILLINTHEBLANK') {
    return (
      <div>
        <label className="form-label">
          Right Answer <span className="text-muted fw-normal small">(fill-in-the-blank answer)</span>
        </label>
        <input
          type="text"
          className="form-control"
          style={{ maxWidth: 320 }}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          placeholder="e.g. London"
        />
      </div>
    );
  }

  if (questionType === 'MULTICORRECT') {
    const selected = value ? value.split(',').map((s) => s.trim()).filter(Boolean) : [];
    const toggle = (idx: string) => {
      const next = selected.includes(idx)
        ? selected.filter((s) => s !== idx)
        : [...selected, idx].sort((a, b) => parseInt(a) - parseInt(b));
      onChange(next.join(','));
    };
    return (
      <div>
        <label className="form-label">
          Right Answer <span className="text-muted fw-normal small">(select all correct options)</span>
        </label>
        <div className="d-flex flex-wrap gap-2">
          {options.map((opt, i) => {
            const idx = String(i + 1);
            const checked = selected.includes(idx);
            return (
              <label
                key={i}
                className={`d-flex align-items-center gap-2 px-3 py-2 rounded border cursor-pointer ${
                  checked ? 'border-orange bg-orange-light' : 'border-secondary-subtle'
                }`}
                style={{ cursor: 'pointer', fontSize: '0.875rem', fontWeight: 500 }}
              >
                <input
                  type="checkbox"
                  className="form-check-input m-0"
                  checked={checked}
                  onChange={() => toggle(idx)}
                  disabled={disabled}
                />
                <span className="fw-700 me-1">{idx}.</span>
                <span style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {plainText(opt, `Option ${idx}`)}
                </span>
              </label>
            );
          })}
        </div>
      </div>
    );
  }

  // SINGLECORRECT or TRUE_OR_FALSE → radio buttons
  return (
    <div>
      <label className="form-label">
        Right Answer <span className="text-muted fw-normal small">(select correct option)</span>
      </label>
      <div className="d-flex flex-wrap gap-2">
        {options.map((opt, i) => {
          const idx = String(i + 1);
          const checked = value === idx;
          return (
            <label
              key={i}
              className={`d-flex align-items-center gap-2 px-3 py-2 rounded border ${
                checked ? 'border-orange bg-orange-light' : 'border-secondary-subtle'
              }`}
              style={{ cursor: disabled ? 'not-allowed' : 'pointer', fontSize: '0.875rem', fontWeight: 500 }}
            >
              <input
                type="radio"
                className="form-check-input m-0"
                name={`right-answer-radio`}
                checked={checked}
                onChange={() => onChange(idx)}
                disabled={disabled}
              />
              <span className="fw-700 me-1">{idx}.</span>
              <span style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {plainText(opt, `Option ${idx}`)}
              </span>
            </label>
          );
        })}
      </div>
    </div>
  );
};
