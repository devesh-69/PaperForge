import React, { useState } from 'react';
import type { BackupScope } from '../../db/backup';
import { formatDateTime, formatRelative } from '../../utils/format';
import { lastBackup } from '../../utils/backupMeta';
import { BackupRestoreButtons } from '../common/BackupRestoreButtons';

interface Props {
  icon: string;
  title: string;
  description: string;
  /** what is inside, e.g. "6 templates · 5 question sets" */
  summary: string;
  scope: BackupScope;
  slug: string;
}

export const BackupCard: React.FC<Props> = ({ icon, title, description, summary, scope, slug }) => {
  const [, refresh] = useState(0);
  const last = lastBackup(scope);

  return (
    <div className="card p-3 h-100">
      <div className="d-flex gap-3 mb-3">
        <span className="icon-chip"><i className={`bi ${icon}`}></i></span>
        <div>
          <h2 className="fs-6 mb-0">{title}</h2>
          <p className="small text-muted mb-0">{description}</p>
        </div>
      </div>
      <p className="small mb-1 text-muted">{summary}</p>
      <p className="small mb-3">
        Last backup:{' '}
        {last ? <strong title={formatDateTime(last.toISOString())}>{formatRelative(last.toISOString())}</strong> : <strong className="text-danger">never</strong>}
      </p>
      <div className="d-flex gap-2 flex-wrap mt-auto">
        <BackupRestoreButtons scope={scope} noun={title.toLowerCase()} slug={slug} onDone={() => refresh((n) => n + 1)} />
      </div>
    </div>
  );
};
