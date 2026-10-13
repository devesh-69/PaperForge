import React, { useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { saveAs } from 'file-saver';
import { createBackupBlob, restoreBackup, type BackupScope, type RestoreCounts } from '../../db/backup';
import { recordBackup } from '../../utils/backupMeta';

interface Props {
  scope: BackupScope;
  /** what the backup contains, in plain words: "letterheads and letters" */
  noun: string;
  /** used in the file name: PaperForge_<slug>_backup_2026-10-09.json */
  slug: string;
  /** called after a backup or restore succeeds (lets a parent refresh "last backup") */
  onDone?: () => void;
}

function summary(scope: BackupScope, c: RestoreCounts): string {
  if (scope === 'questions') return `Restored ${c.templates} template(s) and ${c.questionSets} question set(s)`;
  if (scope === 'all') return `Restored ${c.templates} template(s), ${c.questionSets} question set(s), ${c.letterheads} design(s) and ${c.papers} document(s)`;
  return `Restored ${c.letterheads} design(s) and ${c.papers} document(s)`;
}

/** Backup (download JSON) and Restore (merge from JSON) for one tool's data. */
export const BackupRestoreButtons: React.FC<Props> = ({ scope, noun, slug, onDone }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const backup = async () => {
    setBusy(true);
    try {
      const blob = await createBackupBlob(scope);
      saveAs(blob, `PaperForge_${slug}_backup_${new Date().toISOString().slice(0, 10)}.json`);
      recordBackup(scope);
      toast.success('Backup downloaded');
      onDone?.();
    } catch (err) {
      console.error(err);
      toast.error('Backup failed.');
    } finally {
      setBusy(false);
    }
  };

  const restore = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target;
    const file = input.files?.[0];
    if (!file) return;
    try {
      if (!window.confirm(`Restore this backup? Items with the same ID will be overwritten.`)) return;
      setBusy(true);
      toast.success(summary(scope, await restoreBackup(file, scope)));
      onDone?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Restore failed.');
    } finally {
      setBusy(false);
      input.value = '';
    }
  };

  return (
    <>
      <button type="button" className="btn-icon" disabled={busy} onClick={() => void backup()} title={`Download all ${noun} as a JSON file`}>
        <i className="bi bi-box-arrow-down"></i> Backup
      </button>
      <button type="button" className="btn-icon" disabled={busy} onClick={() => inputRef.current?.click()} title="Restore from a PaperForge backup file">
        <i className="bi bi-box-arrow-in-up"></i> Restore
      </button>
      <input ref={inputRef} type="file" accept=".json,application/json" className="d-none" onChange={(e) => void restore(e)} />
    </>
  );
};
