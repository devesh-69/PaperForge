import { z } from 'zod';
import { QUESTION_TYPES, DIFFICULTIES } from '../types';

// ── Plain-text check: is rich content effectively empty? ─────────────────────
export function isRichContentEmpty(html: string): boolean {
  const div = document.createElement('div');
  div.innerHTML = html;
  const text = div.textContent?.trim() ?? '';
  const hasImages = div.querySelector('img') !== null;
  return text.length === 0 && !hasImages;
}

// ── Base schema (fields every question must have) ────────────────────────────
const baseSchema = z.object({
  id: z.string().min(1),
  questionSetId: z.string().min(1),
  qNumber: z.number().int().positive(),
  subject: z.string().min(1, 'Subject is required'),
  questionType: z.enum(QUESTION_TYPES as [string, ...string[]]),
  correctMarks: z.number({ invalid_type_error: 'Correct Marks must be a number' }),
  negativeMarks: z.number({ invalid_type_error: 'Negative Marks must be a number' }),
  difficulty: z.enum(DIFFICULTIES as [string, ...string[]]),
  rightAnswer: z.string(),
  status: z.enum(['valid', 'error', 'unvalidated']),
  errors: z.array(z.any()),
  tags: z.array(z.string()),
  topic: z.string(),
});

export { baseSchema };
