import type { Difficulty, QuestionType } from '../types';
import { DIFFICULTIES, QUESTION_TYPES } from '../types';

export interface ImportWarning {
  qNumber: number;
  message: string;
}

export interface ParseError {
  rawLineOrRow: string;
  message: string;
}

export interface ImportResult {
  questions: import('../types').Question[];
  parseErrors: ParseError[];
  warnings: ImportWarning[];
}

/** 'single correct' / 'true-or-false' / 'TRUE_OR_FALSE' -> canonical type, else null. */
export function normalizeType(raw: string | undefined | null): QuestionType | null {
  const key = (raw ?? '').trim().toUpperCase().replace(/[\s_-]+/g, '');
  if (!key) return null;
  return QUESTION_TYPES.find((t) => t.replace(/_/g, '') === key) ?? null;
}

export function normalizeDifficulty(raw: string | undefined | null): Difficulty | null {
  const key = (raw ?? '').trim().toLowerCase();
  if (!key) return null;
  return DIFFICULTIES.find((d) => d.toLowerCase() === key) ?? null;
}

/** undefined = blank, NaN = present but not a number. */
export function parseMarks(raw: string | undefined | null): number | undefined {
  const t = (raw ?? '').trim();
  if (t === '') return undefined;
  return Number(t);
}

export function parseTags(raw: string | undefined | null): string[] {
  return (raw ?? '')
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);
}

/**
 * Brings a right-answer string into the canonical form used by validation:
 *  - TRUE_OR_FALSE: "true"/"t" -> 1, "false"/"f" -> 2
 *  - SINGLE/MULTI: letters A–J -> 1–10, separators (; / whitespace) -> comma
 * Anything else is returned trimmed and untouched.
 */
export function normalizeRightAnswer(type: QuestionType, raw: string | undefined | null): string {
  const t = (raw ?? '').trim();
  if (!t) return '';
  if (type === 'TRUE_OR_FALSE') {
    const u = t.toUpperCase();
    if (u === 'TRUE' || u === 'T') return '1';
    if (u === 'FALSE' || u === 'F') return '2';
    return t;
  }
  if (type === 'SINGLECORRECT' || type === 'MULTICORRECT') {
    const tokens = t.split(/[,;/\s]+/).filter(Boolean);
    return tokens
      .map((tok) => (/^[A-Ja-j]$/.test(tok) ? String(tok.toUpperCase().charCodeAt(0) - 64) : tok))
      .join(',');
  }
  return t;
}
