import type { Template, SubjectBlock, Question, QuestionType, RichContent } from '../types';
import { v4 as uuidv4 } from 'uuid';

export function hasHtmlContent(rc: RichContent | undefined): boolean {
  if (!rc) return false;
  if (rc.images && rc.images.length > 0) return true;
  if (!rc.html) return false;
  const stripped = rc.html.replace(/<[^>]*>?/gm, '').trim();
  return stripped !== '';
}

export function hasQuestionContent(q: Question, template: Template): boolean {
  if (hasHtmlContent(q.questionText)) return true;
  if (q.rightAnswer && q.rightAnswer.trim() !== '') return true;
  if (hasHtmlContent(q.explanation)) return true;

  const emptyQ = buildEmptyQuestion(q.qNumber, template, '');

  if (q.options && emptyQ.options) {
    for (let i = 0; i < Math.max(q.options.length, emptyQ.options.length); i++) {
      const qOpt = q.options[i];
      const eOpt = emptyQ.options[i];
      if (!qOpt && eOpt) return true;
      if (qOpt && !eOpt) {
        if (hasHtmlContent(qOpt)) return true;
      } else if (qOpt && eOpt) {
        if (qOpt.html !== eOpt.html || (qOpt.images && qOpt.images.length > 0)) return true;
      }
    }
  } else if (q.options?.some(o => hasHtmlContent(o))) {
    return true;
  }

  if (q.subject !== emptyQ.subject) return true;
  if (q.topic !== emptyQ.topic && q.topic !== '') return true;
  if (q.correctMarks !== emptyQ.correctMarks) return true;
  if (q.negativeMarks !== emptyQ.negativeMarks) return true;
  if (q.difficulty !== emptyQ.difficulty) return true;
  if (q.questionType !== emptyQ.questionType) return true;
  if (JSON.stringify(q.tags || []) !== JSON.stringify(emptyQ.tags || [])) return true;

  return false;
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

export function getOptionsCount(type: QuestionType): number {
  if (type === 'NUMERICAL' || type === 'FILLINTHEBLANK') return 0;
  if (type === 'TRUE_OR_FALSE') return 2;
  return 4; // default for SINGLE/MULTI
}

export function buildEmptyQuestion(qNumber: number, template: Template, questionSetId: string): Question {
  const block = findBlock(template, qNumber);
  const type: QuestionType = block?.questionType ?? 'SINGLECORRECT';
  const optCount = getOptionsCount(type);
  const opts = optCount === 0
    ? []
    : type === 'TRUE_OR_FALSE'
    ? [{ html: 'True', images: [] }, { html: 'False', images: [] }]
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
    negativeMarks: block?.negativeMarks ?? 0,
    difficulty: block?.difficulty ?? 'Default',
    questionText: { html: '', images: [] },
    options: opts,
    rightAnswer: '',
    explanation: { html: '', images: [] },
    status: 'unvalidated',
    errors: [],
  };
}
