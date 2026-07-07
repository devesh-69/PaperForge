import type { Question, Template, QuestionType, Difficulty } from '../../types';
import { findBlock, isFieldLocked, getOptionsCount } from '../../utils/resolveLockedFields';

interface PasteResult {
  updatedQuestions: Question[];
  notices: string[];
}

export function parsePasteData(text: string): string[][] {
  // Split into rows and then columns by tabs (Excel/Sheets standard)
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  return lines.map((line) => line.split('\t'));
}

export function applyPasteToGrid(
  startRowIdx: number,
  startColIdx: number,
  pasteGrid: string[][],
  questions: Question[],
  template: Template
): PasteResult {
  const updatedQuestions = [...questions];
  const notices: string[] = [];

  // Map grid col indices to key/option index
  // 0: Q# (Read only, can't change)
  // 1: SUBJECT
  // 2: TOPIC
  // 3: TAGS
  // 4: QUESTION TYPE
  // 5: QUESTION TEXT
  // 6..15: OPTION1 to OPTION10
  // 16: RIGHT ANSWER
  // 17: EXPLANATION
  // 18: CORRECT MARKS
  // 19: NEGATIVE MARKS
  // 20: DIFFICULTY

  for (let r = 0; r < pasteGrid.length; r++) {
    const targetRowIdx = startRowIdx + r;
    if (targetRowIdx >= updatedQuestions.length) {
      // Exceeds existing questions length. Let's break or handle if we should add rows,
      // but react-data-grid rows are constrained by maxQuestions. We limit to existing.
      break;
    }

    const q = { ...updatedQuestions[targetRowIdx] };
    const block = findBlock(template, q.qNumber);

    for (let c = 0; c < pasteGrid[r].length; c++) {
      const targetColIdx = startColIdx + c;
      const rawVal = pasteGrid[r][c]?.trim() ?? '';

      // Skip Q# column editing
      if (targetColIdx === 0) continue;

      if (targetColIdx === 1) {
        // SUBJECT
        if (isFieldLocked(block, 'subject')) {
          notices.push(`Q${q.qNumber}: Subject column ignored — controlled by template block`);
        } else {
          q.subject = rawVal;
        }
      } else if (targetColIdx === 2) {
        // TOPIC
        if (isFieldLocked(block, 'topic')) {
          notices.push(`Q${q.qNumber}: Topic column ignored — controlled by template block`);
        } else {
          q.topic = rawVal;
        }
      } else if (targetColIdx === 3) {
        // TAGS
        if (isFieldLocked(block, 'tags')) {
          notices.push(`Q${q.qNumber}: Tags column ignored — controlled by template block`);
        } else {
          q.tags = rawVal ? rawVal.split(',').map((t) => t.trim()).filter(Boolean) : [];
        }
      } else if (targetColIdx === 4) {
        // QUESTION TYPE
        if (isFieldLocked(block, 'questionType')) {
          notices.push(`Q${q.qNumber}: Question Type column ignored — controlled by template block`);
        } else {
          const typeUpper = rawVal.toUpperCase() as QuestionType;
          q.questionType = typeUpper;
          // Re-align options array length
          const count = getOptionsCount(typeUpper);
          if (count === 0) {
            q.options = [];
          } else {
            const currentOpts = [...q.options];
            if (currentOpts.length < count) {
              while (currentOpts.length < count) currentOpts.push({ html: '', images: [] });
            } else if (currentOpts.length > count) {
              currentOpts.splice(count);
            }
            q.options = currentOpts;
          }
        }
      } else if (targetColIdx === 5) {
        // QUESTION TEXT
        q.questionText = { html: `<p>${rawVal}</p>`, images: q.questionText.images ?? [] };
      } else if (targetColIdx >= 6 && targetColIdx <= 15) {
        // OPTION 1 to 10
        const optIdx = targetColIdx - 6;
        const optCount = getOptionsCount(q.questionType);
        if (optIdx < optCount) {
          const newOpts = [...q.options];
          newOpts[optIdx] = { html: `<p>${rawVal}</p>`, images: newOpts[optIdx]?.images ?? [] };
          q.options = newOpts;
        } else {
          // If trying to paste into disabled options, warn or skip
          notices.push(`Q${q.qNumber}: Option ${optIdx + 1} column ignored — not available for type ${q.questionType}`);
        }
      } else if (targetColIdx === 16) {
        // RIGHT ANSWER
        q.rightAnswer = rawVal;
      } else if (targetColIdx === 17) {
        // EXPLANATION
        q.explanation = { html: `<p>${rawVal}</p>`, images: q.explanation.images ?? [] };
      } else if (targetColIdx === 18) {
        // CORRECT MARKS
        if (isFieldLocked(block, 'correctMarks')) {
          notices.push(`Q${q.qNumber}: Correct Marks column ignored — controlled by template block`);
        } else {
          q.correctMarks = parseFloat(rawVal) || 0;
        }
      } else if (targetColIdx === 19) {
        // NEGATIVE MARKS
        if (isFieldLocked(block, 'negativeMarks')) {
          notices.push(`Q${q.qNumber}: Negative Marks column ignored — controlled by template block`);
        } else {
          q.negativeMarks = parseFloat(rawVal) || 0;
        }
      } else if (targetColIdx === 20) {
        // DIFFICULTY
        if (isFieldLocked(block, 'difficulty')) {
          notices.push(`Q${q.qNumber}: Difficulty column ignored — controlled by template block`);
        } else {
          q.difficulty = rawVal as Difficulty;
        }
      }
    }

    updatedQuestions[targetRowIdx] = q;
  }

  return { updatedQuestions, notices };
}
