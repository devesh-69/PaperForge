import type { Template, SubjectBlock, Question, QuestionType, RichContent } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { htmlToText, parseHtml } from './html';
import { toNegativeMarks } from './marks';

const MIN_OPTIONS = 2;
export const MAX_OPTIONS = 10;

function hasHtmlContent(rc: RichContent | undefined): boolean {
  if (!rc || !rc.html) return false;
  const body = parseHtml(rc.html);
  return (body.textContent?.trim() ?? '') !== '' || body.querySelector('img') !== null;
}

export function findBlock(template: Template, qNumber: number): SubjectBlock | undefined {
  return template.subjectBlocks.find(
    (b) => qNumber >= b.startQ && qNumber <= b.endQ
  );
}

export function isFieldLocked(block: SubjectBlock | undefined, field: keyof SubjectBlock): boolean {
  if (!block) return false;
  if (field === 'subject') return true; // Subject is always locked if block exists
  if (field === 'topic') return block.topic !== undefined && block.topic !== '';
  if (field === 'tags') return block.tags !== undefined && block.tags.length > 0;
  if (field === 'questionType') return block.questionType !== undefined && (block.questionType as string) !== '';
  if (field === 'correctMarks') return block.correctMarks !== undefined;
  if (field === 'negativeMarks') return block.negativeMarks !== undefined;
  if (field === 'difficulty') return block.difficulty !== undefined && (block.difficulty as string) !== '';
  return false;
}

/** Number of options a brand-new question of this type starts with. */
function getOptionsCount(type: QuestionType): number {
  if (type === 'NUMERICAL' || type === 'FILLINTHEBLANK') return 0;
  if (type === 'TRUE_OR_FALSE') return 2;
  return 4; // default for SINGLE/MULTI
}

/** Most options a question of this type may have. */
export function getMaxOptions(type: QuestionType): number {
  if (type === 'NUMERICAL' || type === 'FILLINTHEBLANK') return 0;
  if (type === 'TRUE_OR_FALSE') return 2;
  return MAX_OPTIONS;
}

/** How many option slots the grid should treat as editable for this question. */
export function getVisibleOptionSlots(q: Pick<Question, 'questionType' | 'options'>): number {
  const max = getMaxOptions(q.questionType);
  if (max === 0 || q.questionType === 'TRUE_OR_FALSE') return max;
  // existing options plus one free slot to grow into, never fewer than the default
  return Math.min(max, Math.max(getOptionsCount(q.questionType), q.options.length + 1));
}

function trueFalseOptions(): RichContent[] {
  return [{ html: 'True', images: [] }, { html: 'False', images: [] }];
}

/**
 * Makes an options array valid for `type` without discarding the user's
 * content: options are only ever padded, never truncated, except where the
 * type forbids them (NUMERICAL / FILLINTHEBLANK) or fixes them (TRUE_OR_FALSE).
 */
export function reconcileOptions(
  type: QuestionType,
  options: RichContent[],
  prevType?: QuestionType
): RichContent[] {
  if (type === 'NUMERICAL' || type === 'FILLINTHEBLANK') return [];
  if (type === 'TRUE_OR_FALSE') return trueFalseOptions();
  let opts = options.slice(0, MAX_OPTIONS);
  if (prevType === 'TRUE_OR_FALSE') opts = []; // the fixed True/False options are not real content
  const target = Math.max(opts.length < MIN_OPTIONS ? getOptionsCount(type) : opts.length, MIN_OPTIONS);
  while (opts.length < target) opts.push({ html: '', images: [] });
  return opts;
}

/**
 * Applies every locked field from the question's template block (subject,
 * topic, tags, type, marks, difficulty). Used whenever a question is created,
 * moved, renumbered or loaded, so saved data never drifts from the template.
 * Returns the same object when nothing needs to change.
 */
export function applyTemplateLocks(q: Question, template: Template): Question {
  const block = findBlock(template, q.qNumber);

  const next: Question = { ...q };
  // deductions are always stored as zero or below, locked or not
  next.negativeMarks = toNegativeMarks(q.negativeMarks);
  if (!block) return Object.is(next.negativeMarks, q.negativeMarks) ? q : next;

  next.subject = block.subject;
  if (isFieldLocked(block, 'topic')) next.topic = block.topic as string;
  if (isFieldLocked(block, 'tags')) next.tags = [...(block.tags as string[])];
  if (isFieldLocked(block, 'questionType')) next.questionType = block.questionType as QuestionType;
  if (isFieldLocked(block, 'correctMarks')) next.correctMarks = block.correctMarks as number;
  if (isFieldLocked(block, 'negativeMarks')) next.negativeMarks = toNegativeMarks(block.negativeMarks as number);
  if (isFieldLocked(block, 'difficulty')) next.difficulty = block.difficulty as Question['difficulty'];

  if (next.questionType !== q.questionType) {
    next.options = reconcileOptions(next.questionType, q.options, q.questionType);
  }

  const changed = (Object.keys(next) as (keyof Question)[]).some((k) =>
    k === 'tags' || k === 'options'
      ? JSON.stringify(next[k]) !== JSON.stringify(q[k])
      : !Object.is(next[k], q[k])
  );
  return changed ? next : q;
}

const normHtml = (h: string) =>
  h
    .replace(/<br\s*\/?>/gi, '<br>')
    .replace(/\s+/g, ' ')
    .replace(/> /g, '>')
    .replace(/ </g, '<')
    .trim()
    .replace(/^<p><\/p>$/, '');

const richEqual = (a: RichContent, b: RichContent) => normHtml(a.html) === normHtml(b.html);

/**
 * Content equality for the editor's "unsaved changes" check. Rich text is
 * compared ignoring whitespace-only differences, because the editor
 * re-serialises HTML (trims, closes tags) when it loads a value.
 */
export function questionsEqual(a: Question, b: Question): boolean {
  if (a === b) return true;
  return (
    a.qNumber === b.qNumber &&
    a.subject === b.subject &&
    a.topic === b.topic &&
    a.questionType === b.questionType &&
    a.difficulty === b.difficulty &&
    a.rightAnswer === b.rightAnswer &&
    Object.is(a.correctMarks, b.correctMarks) &&
    Object.is(a.negativeMarks, b.negativeMarks) &&
    a.tags.length === b.tags.length &&
    a.tags.every((t, i) => t === b.tags[i]) &&
    richEqual(a.questionText, b.questionText) &&
    richEqual(a.explanation, b.explanation) &&
    a.options.length === b.options.length &&
    a.options.every((o, i) => richEqual(o, b.options[i]))
  );
}

export function buildEmptyQuestion(qNumber: number, template: Template, questionSetId: string): Question {
  const block = findBlock(template, qNumber);
  const type: QuestionType = block?.questionType ?? 'SINGLECORRECT';
  const optCount = getOptionsCount(type);
  const opts =
    type === 'TRUE_OR_FALSE'
      ? trueFalseOptions()
      : Array.from({ length: optCount }, () => ({ html: '', images: [] }));

  return {
    id: uuidv4(),
    questionSetId,
    qNumber,
    subject: block?.subject ?? '',
    topic: block?.topic ?? '',
    tags: block?.tags ?? [],
    questionType: type,
    correctMarks: block?.correctMarks ?? 1,
    negativeMarks: toNegativeMarks(block?.negativeMarks ?? 0),
    difficulty: block?.difficulty ?? 'Default',
    questionText: { html: '', images: [] },
    options: opts,
    rightAnswer: '',
    explanation: { html: '', images: [] },
    status: 'unvalidated',
    errors: [],
  };
}

/**
 * True when the question holds anything beyond what an untouched, template-
 * defaulted question would. Empty rows are never persisted.
 */
export function hasQuestionContent(q: Question, template: Template): boolean {
  if (hasHtmlContent(q.questionText)) return true;
  if (q.rightAnswer && q.rightAnswer.trim() !== '') return true;
  if (hasHtmlContent(q.explanation)) return true;

  const emptyQ = buildEmptyQuestion(q.qNumber, template, '');
  const opts = q.options ?? [];

  if (q.questionType === 'TRUE_OR_FALSE' && emptyQ.questionType === 'TRUE_OR_FALSE') {
    // fixed options; only differs if tampered with
    if (opts.some((o, i) => htmlToText(o.html) !== htmlToText(emptyQ.options[i]?.html ?? ''))) return true;
  } else if (opts.some((o) => hasHtmlContent(o))) {
    return true;
  }

  if (q.subject !== emptyQ.subject) return true;
  if (q.topic !== emptyQ.topic && q.topic !== '') return true;
  if (!Object.is(q.correctMarks, emptyQ.correctMarks)) return true;
  if (!Object.is(q.negativeMarks, emptyQ.negativeMarks)) return true;
  if (q.difficulty !== emptyQ.difficulty) return true;
  if (q.questionType !== emptyQ.questionType) return true;
  if (JSON.stringify(q.tags || []) !== JSON.stringify(emptyQ.tags || [])) return true;

  return false;
}
