import { formatDate, formatTimeRange } from './layout';
import { extractTokens } from './tokens';
import type { Letterhead, PaperDoc } from './types';

const MAX_NAME_LENGTH = 100;

/** Makes a string safe to use as a file name, keeping spaces and any language's letters. */
function toFileName(raw: string): string {
  return raw
    .normalize('NFC')
    .replace(/[\\/:*?"<>|\u0000-\u001f]+/g, '-')
    .replace(/\s+/g, ' ')
    .replace(/^[\s.-]+|[\s.-]+$/g, '')
    .slice(0, MAX_NAME_LENGTH)
    .trim();
}

/** The pattern used when a design has none: exam papers with "Subject Code" and "Subject" fields -> "247 Maths". */
function effectivePattern(lh: Letterhead): string {
  if (lh.fileNamePattern !== undefined) return lh.fileNamePattern;
  const labels = new Set(lh.detailFields.map((f) => f.label.trim().toLowerCase()));
  return lh.kind === 'paper' && labels.has('subject code') && labels.has('subject') ? '{Subject Code} {Subject}' : '';
}

/** Names a pattern can use: the details-table field labels and the {Tokens} on the header. */
export function fileNameFields(lh: Letterhead): string[] {
  const tokens = extractTokens(lh.elements.flatMap((e) => (e.type === 'text' ? [e.text] : [])));
  return [...new Set([...lh.detailFields.map((f) => f.label.trim()).filter(Boolean), ...tokens])];
}

/**
 * The download name (without extension): the document name if the user typed one,
 * otherwise the design's file-name pattern filled from the document
 * ("{Subject Code} {Subject}" -> "247 Maths"), otherwise the design's name.
 */
export function resolveFileName(lh: Letterhead, doc: PaperDoc): string {
  const typed = toFileName(doc.title);
  if (typed) return typed;

  const pattern = effectivePattern(lh);
  if (pattern.trim()) {
    const byLabel = new Map(lh.detailFields.map((f) => [f.label.trim().toLowerCase(), f] as const));
    const filled = pattern.replace(/\{([^{}]+)\}/g, (_m, name: string) => {
      const key = name.trim();
      const field = byLabel.get(key.toLowerCase());
      if (field) {
        const raw = (doc.details[field.id] ?? '').trim();
        return field.kind === 'date' ? formatDate(raw) : field.kind === 'timeRange' ? formatTimeRange(raw) : raw;
      }
      return (doc.fields[key] ?? '').trim();
    });
    const name = toFileName(filled);
    if (name) return name;
  }
  return toFileName(lh.name) || 'Document';
}
