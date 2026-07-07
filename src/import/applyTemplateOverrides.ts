import type { Question, Template } from '../types';
import { findBlock, isFieldLocked } from '../utils/resolveLockedFields';

interface ApplyResult {
  questions: Question[];
  infoNotices: { qNumber: number; message: string }[];
}

export function applyTemplateOverrides(rawQuestions: Question[], template: Template): ApplyResult {
  const infoNotices: { qNumber: number; message: string }[] = [];

  const questions = rawQuestions.map((q) => {
    const block = findBlock(template, q.qNumber);
    if (!block) return q;

    const updated = { ...q };

    if (isFieldLocked(block, 'subject') && block.subject !== q.subject) {
      infoNotices.push({ qNumber: q.qNumber, message: `Row ${q.qNumber}: Subject column ignored — controlled by template` });
      updated.subject = block.subject;
    }
    if (isFieldLocked(block, 'topic') && block.topic !== undefined) {
      infoNotices.push({ qNumber: q.qNumber, message: `Row ${q.qNumber}: Topic column ignored — controlled by template` });
      updated.topic = block.topic;
    }
    if (isFieldLocked(block, 'tags') && block.tags !== undefined) {
      infoNotices.push({ qNumber: q.qNumber, message: `Row ${q.qNumber}: Tags column ignored — controlled by template` });
      updated.tags = block.tags;
    }
    if (isFieldLocked(block, 'questionType') && block.questionType !== undefined) {
      infoNotices.push({ qNumber: q.qNumber, message: `Row ${q.qNumber}: Question Type column ignored — controlled by template` });
      updated.questionType = block.questionType;
    }
    if (isFieldLocked(block, 'correctMarks') && block.correctMarks !== undefined) {
      infoNotices.push({ qNumber: q.qNumber, message: `Row ${q.qNumber}: Correct Marks column ignored — controlled by template` });
      updated.correctMarks = block.correctMarks;
    }
    if (isFieldLocked(block, 'negativeMarks') && block.negativeMarks !== undefined) {
      infoNotices.push({ qNumber: q.qNumber, message: `Row ${q.qNumber}: Negative Marks column ignored — controlled by template` });
      updated.negativeMarks = block.negativeMarks;
    }
    if (isFieldLocked(block, 'difficulty') && block.difficulty !== undefined) {
      infoNotices.push({ qNumber: q.qNumber, message: `Row ${q.qNumber}: Difficulty column ignored — controlled by template` });
      updated.difficulty = block.difficulty;
    }

    return updated;
  });

  return { questions, infoNotices };
}
