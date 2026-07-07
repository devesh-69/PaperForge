import React from 'react';
import type { QuestionFieldError } from '../../types';

interface Props {
  errorsByQuestion: Record<number, QuestionFieldError[]>;
  onNavigateToQuestion: (qNumber: number) => void;
  onDismiss: () => void;
}

export const ErrorReportPanel: React.FC<Props> = ({
  errorsByQuestion,
  onNavigateToQuestion,
  onDismiss,
}) => {
  const allQNumbers = Object.keys(errorsByQuestion)
    .map(Number)
    .sort((a, b) => a - b);
  const totalErrors = allQNumbers.reduce(
    (sum, qn) => sum + errorsByQuestion[qn].length,
    0
  );

  if (totalErrors === 0) return null;

  return (
    <div
      className="card border-danger mb-4"
      style={{ borderWidth: 1.5, overflow: 'hidden' }}
      role="alert"
    >
      {/* Header */}
      <div
        className="d-flex align-items-center justify-content-between px-4 py-3"
        style={{ background: '#fff1f1', borderBottom: '1px solid #fecaca' }}
      >
        <div className="d-flex align-items-center gap-2">
          <i className="bi bi-exclamation-triangle-fill text-danger fs-5"></i>
          <span className="fw-700" style={{ color: '#991b1b' }}>
            {totalErrors} Validation Error{totalErrors !== 1 ? 's' : ''} —
            Export blocked until all are resolved
          </span>
        </div>
        <button
          type="button"
          className="btn-icon danger"
          onClick={onDismiss}
          title="Dismiss panel"
        >
          <i className="bi bi-x-lg"></i>
        </button>
      </div>

      {/* Error list */}
      <div style={{ maxHeight: 340, overflowY: 'auto' }}>
        {allQNumbers.map((qNum) =>
          errorsByQuestion[qNum].map((err, idx) => (
            <button
              key={`${qNum}-${idx}`}
              type="button"
              className="w-100 text-start border-0 border-bottom px-4 py-2"
              style={{
                background: 'transparent',
                borderColor: '#fecaca',
                cursor: 'pointer',
                transition: 'background .12s',
                fontSize: '0.85rem',
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = '#fff5f5')
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = 'transparent')
              }
              onClick={() => onNavigateToQuestion(qNum)}
            >
              <span
                className="fw-700 me-2"
                style={{ color: '#dc2626', minWidth: 36, display: 'inline-block' }}
              >
                Q{qNum}
              </span>
              <span className="text-muted me-2" style={{ fontSize: '0.78rem' }}>
                ({err.field})
              </span>
              <span style={{ color: '#374151' }}>— {err.message}</span>
              <i
                className="bi bi-arrow-right-short float-end text-muted"
                style={{ lineHeight: 1.6 }}
              ></i>
            </button>
          ))
        )}
      </div>
    </div>
  );
};
