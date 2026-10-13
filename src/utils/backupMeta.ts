// When each kind of backup was last downloaded. Kept in localStorage (a convenience for
// reminders, not data): if it is unavailable the app simply reports "never".

import type { BackupScope } from '../db/backup';

const KEY = (scope: BackupScope) => `pf:lastBackup:${scope}`;
const ALL_SCOPES: BackupScope[] = ['questions', 'letters', 'examPapers', 'all'];

/** Remember that a backup was just taken. An "everything" backup covers every scope. */
export function recordBackup(scope: BackupScope, when: Date = new Date()): void {
  const scopes = scope === 'all' ? ALL_SCOPES : [scope];
  try {
    scopes.forEach((s) => localStorage.setItem(KEY(s), when.toISOString()));
  } catch { /* storage unavailable */ }
}

export function lastBackup(scope: BackupScope): Date | null {
  try {
    const v = localStorage.getItem(KEY(scope));
    const d = v ? new Date(v) : null;
    return d && !Number.isNaN(d.getTime()) ? d : null;
  } catch {
    return null;
  }
}

/** The most recent backup of any kind. */
export function latestBackup(): Date | null {
  const dates = ALL_SCOPES.map(lastBackup).filter((d): d is Date => d !== null);
  return dates.length ? new Date(Math.max(...dates.map((d) => d.getTime()))) : null;
}

export const BACKUP_STALE_DAYS = 7;

export function daysSince(d: Date, now: Date = new Date()): number {
  return Math.floor((now.getTime() - d.getTime()) / 86_400_000);
}
