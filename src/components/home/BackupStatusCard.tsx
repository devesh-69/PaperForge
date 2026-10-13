import React from 'react';
import { Link } from 'react-router-dom';
import { BACKUP_STALE_DAYS, daysSince, latestBackup } from '../../utils/backupMeta';

/** Tells the user how fresh their last backup is (all data lives only in this browser). */
export const BackupStatusCard: React.FC = () => {
  const last = latestBackup();
  const days = last ? daysSince(last) : null;
  const stale = days === null || days >= BACKUP_STALE_DAYS;
  const headline = last === null ? 'You have never backed up' : days === 0 ? 'Last backup: today' : `Last backup: ${days} day${days === 1 ? '' : 's'} ago`;

  return (
    <section className="card p-3" aria-labelledby="backup-heading">
      <div className="d-flex gap-3">
        <span className="icon-chip"><i className="bi bi-shield-check"></i></span>
        <div>
          <h2 id="backup-heading" className="fs-6 mb-1">{headline}</h2>
          <p className="small text-muted mb-0">
            {stale ? 'Your work is saved only in this browser. Download a backup so you can restore it on any computer.' : 'Your work is safe. Back up again after big changes.'}
          </p>
        </div>
      </div>
      <div className="mt-3">
        <Link to="/backup" className={`${stale ? 'btn-orange' : 'btn-outline-black'} text-decoration-none`}>
          <i className="bi bi-box-arrow-down"></i>Back up now
        </Link>
      </div>
    </section>
  );
};
