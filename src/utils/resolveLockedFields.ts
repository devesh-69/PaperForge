import type { Template, SubjectBlock, Question, QuestionType } from '../types';
import { v4 as uuidv4 } from 'uuid';

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
