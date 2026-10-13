import type { Question, Template, QuestionFieldError } from '../types';
import { QUESTION_TYPES, DIFFICULTIES } from '../types';
import { isRichContentEmpty } from './schemas';
import { negativeMarksTooLarge } from '../utils/marks';

export interface ValidationResult {
  isValid: boolean;
  errorsByQuestion: Record<number, QuestionFieldError[]>;
  infoNotices: { qNumber: number; message: string }[];
}

const INT_RE = /^\d+$/;

/** Strict "1,3,4" parser: returns null if any token is not a positive integer. */
function parseRightAnswerIndices(value: string): number[] | null {
  const tokens = value.split(',').map((s) => s.trim());
  if (tokens.length === 0 || tokens.some((t) => !INT_RE.test(t))) return null;
  return tokens.map((t) => parseInt(t, 10));
}

function isFiniteNumber(n: unknown): n is number {
  return typeof n === 'number' && Number.isFinite(n);
}

export function validateQuestionSet(
  questions: Question[],
  template: Pick<Template, 'maxQuestions'> | null
): ValidationResult {
  const errorsByQuestion: Record<number, QuestionFieldError[]> = {};
  const infoNotices: { qNumber: number; message: string }[] = [];

  const addError = (qNumber: number, field: QuestionFieldError['field'], message: string) => {
    if (!errorsByQuestion[qNumber]) errorsByQuestion[qNumber] = [];
    errorsByQuestion[qNumber].push({ field, message });
  };

  // Duplicate question numbers (reported once per number)
  const seen = new Set<number>();
  const reportedDup = new Set<number>();
  for (const { qNumber: n } of questions) {
    if (seen.has(n) && !reportedDup.has(n)) {
      addError(n, 'qNumber', `Duplicate question number Q${n}`);
      reportedDup.add(n);
    }
    seen.add(n);
  }

  // Gaps in the sequence (including a missing start), reported as ranges
  if (questions.length > 0) {
    const sorted = Array.from(seen).sort((a, b) => a - b);
    const noticeRange = (from: number, to: number) => {
      const label = from === to ? `Q${from} is` : `Q${from}–Q${to} are`;
      infoNotices.push({ qNumber: from, message: `${label} missing from the sequence` });
    };
    if (sorted[0] > 1) noticeRange(1, sorted[0] - 1);
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i] !== sorted[i - 1] + 1) noticeRange(sorted[i - 1] + 1, sorted[i] - 1);
    }
  }

  // Max questions: any question numbered beyond the limit
  const maxQ = template?.maxQuestions ?? null;
  if (maxQ !== null) {
    for (const q of questions) {
      if (q.qNumber > maxQ) {
        addError(q.qNumber, 'qNumber', `Q${q.qNumber} exceeds the template's max questions limit (${maxQ})`);
      }
    }
  }

  // Per-question validation
  for (const q of questions) {
    const qNum = q.qNumber;

    if (!q.subject || !q.subject.trim()) {
      addError(qNum, 'subject', 'Subject is required');
    }

    const typeValid = (QUESTION_TYPES as string[]).includes(q.questionType);
    if (!q.questionType) {
      addError(qNum, 'questionType', 'Question type is required');
    } else if (!typeValid) {
      addError(qNum, 'questionType', `Question type "${q.questionType}" is not valid (use ${QUESTION_TYPES.join(', ')})`);
    }

    if (isRichContentEmpty(q.questionText.html)) {
      addError(qNum, 'questionText', 'Question text must not be empty');
    }

    if (!isFiniteNumber(q.correctMarks)) {
      addError(qNum, 'correctMarks', 'Correct Marks is missing or not a valid number');
    } else if (q.correctMarks < 0) {
      addError(qNum, 'correctMarks', `Correct Marks must not be negative (${q.correctMarks})`);
    }

    if (!isFiniteNumber(q.negativeMarks)) {
      addError(qNum, 'negativeMarks', 'Negative Marks is missing or not a valid number (enter 0 for no negative marking)');
    } else {
      // The sign is normalised on save/export, so only the size matters here.
      const tooLarge = negativeMarksTooLarge(q.correctMarks, q.negativeMarks);
      if (tooLarge) addError(qNum, 'negativeMarks', tooLarge);
    }

    if (!(DIFFICULTIES as string[]).includes(q.difficulty)) {
      addError(qNum, 'difficulty', `Difficulty "${q.difficulty}" is not a valid value`);
    }

    const answer = (q.rightAnswer ?? '').trim();

    switch (q.questionType) {
      case 'SINGLECORRECT': {
        if (q.options.length < 2 || q.options.length > 10) {
          addError(qNum, 'options', `SINGLECORRECT requires 2–10 options (has ${q.options.length})`);
        }
        if (q.options.some((o) => isRichContentEmpty(o.html))) {
          addError(qNum, 'options', 'All options must have content (no empty options)');
        }
        const idx = INT_RE.test(answer) ? parseInt(answer, 10) : NaN;
        if (!answer) {
          addError(qNum, 'rightAnswer', 'Select the correct option');
        } else if (isNaN(idx) || idx < 1 || idx > q.options.length) {
          addError(
            qNum,
            'rightAnswer',
            `Right Answer "${q.rightAnswer}" is not a valid option number (this question has ${q.options.length} options)`
          );
        }
        break;
      }
      case 'MULTICORRECT': {
        if (q.options.length < 2 || q.options.length > 10) {
          addError(qNum, 'options', `MULTICORRECT requires 2–10 options (has ${q.options.length})`);
        }
        if (q.options.some((o) => isRichContentEmpty(o.html))) {
          addError(qNum, 'options', 'All options must have content (no empty options)');
        }
        if (!answer) {
          addError(qNum, 'rightAnswer', 'Select at least one correct option');
        } else {
          const indices = parseRightAnswerIndices(answer);
          if (indices === null) {
            addError(qNum, 'rightAnswer', `Right Answer "${q.rightAnswer}" must be comma-separated option numbers (e.g. 1,3)`);
          } else {
            if (new Set(indices).size !== indices.length) {
              addError(qNum, 'rightAnswer', 'Right Answer contains duplicate indices');
            }
            for (const idx of indices) {
              if (idx < 1 || idx > q.options.length) {
                addError(
                  qNum,
                  'rightAnswer',
                  `Right Answer index "${idx}" has no matching option (only ${q.options.length} options provided)`
                );
              }
            }
          }
        }
        break;
      }
      case 'TRUE_OR_FALSE': {
        if (q.options.length !== 2) {
          addError(qNum, 'options', `TRUE_OR_FALSE must have exactly 2 options (has ${q.options.length})`);
        }
        if (!answer) {
          addError(qNum, 'rightAnswer', 'Select True or False');
        } else if (answer !== '1' && answer !== '2') {
          addError(qNum, 'rightAnswer', `Right Answer "${q.rightAnswer}" must be 1 (True) or 2 (False)`);
        }
        break;
      }
      case 'NUMERICAL': {
        if (q.options.length !== 0) {
          addError(qNum, 'options', 'NUMERICAL questions must not have any options');
        }
        if (!answer) {
          addError(qNum, 'rightAnswer', 'Right Answer is required for NUMERICAL questions');
        } else if (!Number.isFinite(Number(answer))) {
          addError(qNum, 'rightAnswer', `Right Answer "${q.rightAnswer}" must be a valid number`);
        }
        break;
      }
      case 'FILLINTHEBLANK': {
        if (q.options.length !== 0) {
          addError(qNum, 'options', 'FILLINTHEBLANK questions must not have any options');
        }
        if (!answer) {
          addError(qNum, 'rightAnswer', 'Right Answer must not be empty for FILLINTHEBLANK questions');
        }
        break;
      }
      default:
        break; // already reported as an invalid type above
    }
  }

  const isValid = Object.keys(errorsByQuestion).length === 0;
  return { isValid, errorsByQuestion, infoNotices };
}
