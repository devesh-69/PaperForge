import type { Question, Template } from '../../types';
import {
  findBlock,
  isFieldLocked,
  getMaxOptions,
  reconcileOptions,
  buildEmptyQuestion,
} from '../../utils/resolveLockedFields';
import { textToHtml } from '../../utils/html';
import { toNegativeMarks } from '../../utils/marks';
import {
  normalizeDifficulty,
  normalizeRightAnswer,
  normalizeType,
  parseMarks,
  parseTags,
} from '../../import/normalize';
import { GRID_FIELD_ORDER } from './gridFields';

interface PasteResult {
  updatedQuestions: Question[];
  notices: string[];
}

const MAX_PASTE_ROWS = 1000;

/**
 * Parses clipboard text (tab-separated, as produced by Excel / Google Sheets).
 * Cells wrapped in double quotes may contain tabs, newlines and "" escapes.
 */
export function parsePasteData(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; } else { inQuotes = false; }
      } else {
        field += c;
      }
    } else if (c === '"' && field === '') {
      inQuotes = true;
    } else if (c === '\t') {
      row.push(field);
      field = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += c;
    }
  }
  if (field !== '' || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

export function applyPasteToGrid(
  startRowIdx: number,
  startColIdx: number,
  pasteGrid: string[][],
  questions: Question[],
  template: Template,
  questionSetId: string
): PasteResult {
  const updatedQuestions = [...questions];
  const notices: string[] = [];
  const maxRows = Math.min(template.maxQuestions ?? MAX_PASTE_ROWS, MAX_PASTE_ROWS);
  let skippedRows = 0;

  for (let r = 0; r < pasteGrid.length; r++) {
    const targetRowIdx = startRowIdx + r;

    if (targetRowIdx >= maxRows) {
      skippedRows++;
      continue;
    }
    // Rows are numbered 1..n, so growing the grid just appends the next numbers.
    while (updatedQuestions.length <= targetRowIdx) {
      updatedQuestions.push(buildEmptyQuestion(updatedQuestions.length + 1, template, questionSetId));
    }

    const q = { ...updatedQuestions[targetRowIdx] };
    const block = findBlock(template, q.qNumber);
    const tag = `Q${q.qNumber}`;

    for (let c = 0; c < pasteGrid[r].length; c++) {
      const field = GRID_FIELD_ORDER[startColIdx + c];
      if (!field) break; // past the last column
      const rawVal = pasteGrid[r][c]?.trim() ?? '';

      if (field === 'qNumber') continue; // read-only

      if (field === 'subject') {
        if (isFieldLocked(block, 'subject')) notices.push(`${tag}: Subject column ignored — controlled by template block`);
        else q.subject = rawVal;
      } else if (field === 'topic') {
        if (isFieldLocked(block, 'topic')) notices.push(`${tag}: Topic column ignored — controlled by template block`);
        else q.topic = rawVal;
      } else if (field === 'tags') {
        if (isFieldLocked(block, 'tags')) notices.push(`${tag}: Tags column ignored — controlled by template block`);
        else q.tags = parseTags(rawVal);
      } else if (field === 'questionType') {
        if (isFieldLocked(block, 'questionType')) {
          notices.push(`${tag}: Question Type column ignored — controlled by template block`);
        } else if (rawVal) {
          const type = normalizeType(rawVal);
          if (!type) {
            notices.push(`${tag}: Unknown question type "${rawVal}" ignored`);
          } else {
            q.options = reconcileOptions(type, q.options, q.questionType);
            q.questionType = type;
          }
        }
      } else if (field === 'questionText') {
        q.questionText = { html: textToHtml(rawVal), images: [] };
      } else if (field.startsWith('option_')) {
        const optIdx = parseInt(field.slice('option_'.length), 10) - 1;
        if (optIdx >= getMaxOptions(q.questionType)) {
          notices.push(`${tag}: Option ${optIdx + 1} column ignored — not available for type ${q.questionType}`);
        } else if (rawVal !== '' || optIdx < q.options.length) {
          const newOpts = [...q.options];
          while (newOpts.length <= optIdx) newOpts.push({ html: '', images: [] });
          newOpts[optIdx] = { html: textToHtml(rawVal), images: [] };
          q.options = newOpts;
        }
      } else if (field === 'rightAnswer') {
        q.rightAnswer = normalizeRightAnswer(q.questionType, rawVal);
      } else if (field === 'explanation') {
        q.explanation = { html: textToHtml(rawVal), images: [] };
      } else if (field === 'correctMarks' || field === 'negativeMarks') {
        const label = field === 'correctMarks' ? 'Correct Marks' : 'Negative Marks';
        if (isFieldLocked(block, field)) {
          notices.push(`${tag}: ${label} column ignored — controlled by template block`);
        } else {
          const n = parseMarks(rawVal);
          if (n === undefined) { /* blank: leave unchanged */ }
          else if (Number.isNaN(n)) notices.push(`${tag}: ${label} "${rawVal}" is not a number — ignored`);
          else q[field] = field === 'negativeMarks' ? toNegativeMarks(n) : n;
        }
      } else if (field === 'difficulty') {
        if (isFieldLocked(block, 'difficulty')) {
          notices.push(`${tag}: Difficulty column ignored — controlled by template block`);
        } else if (rawVal) {
          const d = normalizeDifficulty(rawVal);
          if (d) q.difficulty = d;
          else notices.push(`${tag}: Unknown difficulty "${rawVal}" ignored`);
        }
      }
    }

    updatedQuestions[targetRowIdx] = q;
  }

  if (skippedRows > 0) {
    notices.unshift(
      `${skippedRows} pasted row${skippedRows !== 1 ? 's' : ''} skipped — the limit is ${maxRows} questions`
    );
  }

  return { updatedQuestions, notices };
}
