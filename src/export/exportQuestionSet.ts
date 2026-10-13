import { saveAs } from 'file-saver';
import { db } from '../db/db';
import type { QuestionSet, Template } from '../types';
import { applyTemplateLocks } from '../utils/resolveLockedFields';
import { validateQuestionSet, type ValidationResult } from '../validation/validateQuestionSet';
import { generateDocx, getDocxFilename } from './docxExporter';

export type ExportOutcome =
  | { ok: true }
  | { ok: false; validation: ValidationResult };

/**
 * The single export path: resolves template-locked fields, refuses to export a
 * set with validation errors, then builds and saves the .docx. `template` may
 * be null when the set's template was deleted (only the template-independent
 * checks run in that case).
 */
export async function exportQuestionSet(qs: QuestionSet, template: Template | null): Promise<ExportOutcome> {
  const resolved: QuestionSet = template
    ? { ...qs, questions: qs.questions.map((q) => applyTemplateLocks(q, template)) }
    : qs;

  const validation = validateQuestionSet(resolved.questions, template);
  if (!validation.isValid) return { ok: false, validation };

  const blob = await generateDocx(resolved, template);
  saveAs(blob, getDocxFilename(qs));
  // partial update so edits made while exporting are not overwritten
  await db.questionSets.update(qs.id, { lastGeneratedAt: new Date().toISOString() });
  return { ok: true };
}
