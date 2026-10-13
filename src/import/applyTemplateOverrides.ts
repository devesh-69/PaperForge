import type { Question, Template } from '../types';
import { applyTemplateLocks, findBlock, isFieldLocked } from '../utils/resolveLockedFields';

interface ApplyResult {
  questions: Question[];
  infoNotices: { qNumber: number; message: string }[];
}

type LockedKey = 'subject' | 'topic' | 'tags' | 'questionType' | 'correctMarks' | 'negativeMarks' | 'difficulty';

const LABELS: [LockedKey, string][] = [
  ['subject', 'Subject'],
  ['topic', 'Topic'],
  ['tags', 'Tags'],
  ['questionType', 'Question Type'],
  ['correctMarks', 'Correct Marks'],
  ['negativeMarks', 'Negative Marks'],
  ['difficulty', 'Difficulty'],
];

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/**
 * Forces template-locked fields onto imported questions. A notice is only
 * raised when the file actually disagreed with the template.
 */
export function applyTemplateOverrides(rawQuestions: Question[], template: Template): ApplyResult {
  const infoNotices: { qNumber: number; message: string }[] = [];

  const questions = rawQuestions.map((q) => {
    const block = findBlock(template, q.qNumber);
    if (!block) return q;

    const updated = applyTemplateLocks(q, template);

    for (const [key, label] of LABELS) {
      // nothing to report when the file simply left a text field empty
      const provided = key === 'subject' || key === 'topic' ? q[key] !== '' : key === 'tags' ? q.tags.length > 0 : true;
      if (provided && isFieldLocked(block, key) && !same(q[key], updated[key])) {
        infoNotices.push({
          qNumber: q.qNumber,
          message: `Row ${q.qNumber}: ${label} column ignored — controlled by template`,
        });
      }
    }
    return updated;
  });

  return { questions, infoNotices };
}
