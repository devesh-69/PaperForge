import React from 'react';

interface InfoNotice {
  qNumber: number;
  message: string;
}

interface Props {
  notices: InfoNotice[];
  onNavigateToQuestion?: (qNumber: number) => void;
}

export const InfoNoticeList: React.FC<Props> = ({ notices, onNavigateToQuestion }) => {
  if (notices.length === 0) return null;

  return (
    <div
      className="card mb-4"
      style={{ border: '1.5px solid var(--orange)', overflow: 'hidden' }}
    >
      <div
        className="d-flex align-items-center gap-2 px-4 py-2"
        style={{ background: 'var(--orange-light)', borderBottom: '1px solid #fed7aa' }}
      >
        <i className="bi bi-info-circle-fill" style={{ color: 'var(--orange-dark)' }}></i>
        <span className="fw-700 small" style={{ color: 'var(--orange-dark)' }}>
          {notices.length} Notice{notices.length !== 1 ? 's' : ''}
        </span>
      </div>
      <div style={{ maxHeight: 200, overflowY: 'auto' }}>
        {notices.map((notice, idx) => (
          <div
            key={idx}
            className="d-flex align-items-start gap-2 px-4 py-2 border-bottom"
            style={{ borderColor: '#fed7aa', fontSize: '0.82rem' }}
          >
            <span
              className="fw-700 flex-shrink-0"
              style={{ color: 'var(--orange-dark)', minWidth: 36 }}
            >
              Q{notice.qNumber}
            </span>
            <span style={{ color: '#374151', flex: 1 }}>{notice.message}</span>
            {onNavigateToQuestion && (
              <button
                type="button"
                className="btn-icon flex-shrink-0"
                style={{ padding: '0.1rem 0.3rem', fontSize: '0.75rem' }}
                onClick={() => onNavigateToQuestion(notice.qNumber)}
                title="Go to this question"
              >
                <i className="bi bi-arrow-right-short"></i>
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
