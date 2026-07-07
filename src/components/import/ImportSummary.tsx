import React from 'react';

interface ParseError {
  rawLineOrRow: string;
  message: string;
}

interface InfoNotice {
  qNumber: number;
  message: string;
}

interface Props {
  questionCount: number;
  parseErrors: ParseError[];
  infoNotices: InfoNotice[];
  onConfirm: () => void;
  onCancel: () => void;
}

export const ImportSummary: React.FC<Props> = ({
  questionCount,
  parseErrors,
  infoNotices,
  onConfirm,
  onCancel,
}) => {
  return (
    <div className="card p-4">
      <h5 className="fw-700 mb-3">
        <i className="bi bi-file-earmark-check me-2 text-orange"></i>
        Import Preview
      </h5>

      <div className="d-flex gap-3 mb-4 flex-wrap">
        <div className="card p-3 text-center import-summary-card">
          <div className="import-summary-count">{questionCount}</div>
          <div className="text-muted small">Questions Found</div>
        </div>
        {infoNotices.length > 0 && (
          <div className="card p-3 text-center import-summary-card">
            <div className="import-summary-count warning">{infoNotices.length}</div>
            <div className="text-muted small">Info Notices</div>
          </div>
        )}
        {parseErrors.length > 0 && (
          <div className="card p-3 text-center import-summary-card" style={{ borderColor: '#fecaca' }}>
            <div className="import-summary-count error">{parseErrors.length}</div>
            <div className="text-muted small">Parse Errors</div>
          </div>
        )}
      </div>

      {parseErrors.length > 0 && (
        <div className="mb-3">
          <div className="fw-600 small mb-2 text-danger">
            <i className="bi bi-exclamation-triangle-fill me-1"></i>Parse Errors (these rows were skipped):
          </div>
          <div className="import-summary-list">
            {parseErrors.map((e, i) => (
              <div key={i} className="import-summary-error-item">
                <span className="text-danger fw-600">{e.message}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {infoNotices.length > 0 && (
        <div className="mb-4">
          <div className="fw-600 small mb-2 text-orange">
            <i className="bi bi-info-circle-fill me-1"></i>Info Notices (locked field overrides):
          </div>
          <div className="import-summary-list">
            {infoNotices.map((n, i) => (
              <div key={i} className="import-summary-notice-item">
                {n.message}
              </div>
            ))}
          </div>
        </div>
      )}

      {questionCount === 0 ? (
        <div className="alert alert-warning py-2 mb-3">
          <i className="bi bi-exclamation-triangle me-2"></i>
          No questions could be parsed. Check the file format and try again.
        </div>
      ) : null}

      <div className="d-flex gap-2 justify-content-end">
        <button type="button" className="btn-icon" onClick={onCancel}>
          Cancel
        </button>
        <button
          type="button"
          className="btn-orange"
          onClick={onConfirm}
          disabled={questionCount === 0}
        >
          <i className="bi bi-check-circle me-1"></i>
          Review & Import ({questionCount} questions)
        </button>
      </div>
    </div>
  );
};
