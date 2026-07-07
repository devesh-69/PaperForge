import type { Question, Template, QuestionFieldError } from '../types';
import { isRichContentEmpty } from './schemas';

export interface ValidationResult {
  isValid: boolean;
  errorsByQuestion: Record<number, QuestionFieldError[]>;
  infoNotices: { qNumber: number; message: string }[];
}

function parseRightAnswerIndices(value: string): number[] {
  return value
    .split(',')
    .map((s) => parseInt(s.trim(), 10))
    .filter((n) => !isNaN(n));
}

export function validateQuestionSet(
  questions: Question[],
  template: Template
): ValidationResult {
  const errorsByQuestion: Record<number, QuestionFieldError[]> = {};
  const infoNotices: { qNumber: number; message: string }[] = [];

  const addError = (qNumber: number, field: QuestionFieldError['field'], message: string) => {
    if (!errorsByQuestion[qNumber]) errorsByQuestion[qNumber] = [];
    errorsByQuestion[qNumber].push({ field, message });
  };

  // Check for duplicate qNumbers
  const qNumbers = questions.map((q) => q.qNumber);
  const seen = new Set<number>();
  qNumbers.forEach((n) => {
    if (seen.has(n)) {
      addError(n, 'qNumber', `Duplicate question number Q${n}`);
    }
    seen.add(n);
  });

  // Check for gaps in qNumber sequence
  if (questions.length > 0) {
    const sorted = [...qNumbers].sort((a, b) => a - b);
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i] !== sorted[i - 1] + 1) {
        // Gap detected
        for (let missing = sorted[i - 1] + 1; missing < sorted[i]; missing++) {
          infoNotices.push({ qNumber: missing, message: `Q${missing} is missing from the sequence (gap between Q${sorted[i-1]} and Q${sorted[i]})` });
        }
      }
    }
  }

  // Check max questions
  if (template.maxQuestions !== null && questions.length > template.maxQuestions) {
    // Report on extra questions
    const sorted = [...questions].sort((a, b) => a.qNumber - b.qNumber);
    for (let i = template.maxQuestions; i < sorted.length; i++) {
      addError(
        sorted[i].qNumber,
        'qNumber',
        `Q${sorted[i].qNumber} exceeds the template's max questions limit (${template.maxQuestions})`
      );
    }
  }

  // Per-question validation
  for (const q of questions) {
    const qNum = q.qNumber;

    // Required: subject
    if (!q.subject.trim()) {
      addError(qNum, 'subject', 'Subject is required');
    }

    // Required: questionType
    if (!q.questionType) {
      addError(qNum, 'questionType', 'Question type is required');
    }

    // Required: questionText must not be empty
    if (isRichContentEmpty(q.questionText.html)) {
      addError(qNum, 'questionText', 'Question text must not be empty');
    }

    // correctMarks must be a valid number >= 0
    if (isNaN(q.correctMarks)) {
      addError(qNum, 'correctMarks', `Correct Marks is not a valid number ("${q.correctMarks}")`);
    }

    // negativeMarks must be a valid number (warn if > 0, not a hard error)
    if (isNaN(q.negativeMarks)) {
      addError(qNum, 'negativeMarks', `Negative Marks is not a valid number ("${q.negativeMarks}")`);
    } else if (q.negativeMarks > 0) {
      infoNotices.push({
        qNumber: qNum,
        message: `Q${qNum}: Negative Marks is positive (${q.negativeMarks}). Confirm this is intentional.`,
      });
    }

    // difficulty must be valid
    const validDifficulties = ['Easy', 'Medium', 'Hard', 'Default'];
    if (!validDifficulties.includes(q.difficulty)) {
      addError(qNum, 'difficulty', `Difficulty "${q.difficulty}" is not a valid value`);
    }

    // Per-type validation
    switch (q.questionType) {
      case 'SINGLECORRECT': {
        if (q.options.length < 2 || q.options.length > 10) {
          addError(qNum, 'options', `SINGLECORRECT requires 2–10 options (has ${q.options.length})`);
        }
        const nonEmpty = q.options.filter((o) => !isRichContentEmpty(o.html));
        if (nonEmpty.length !== q.options.length) {
          addError(qNum, 'options', 'All options must have content (no empty options)');
        }
        const ansIdx = parseInt(q.rightAnswer, 10);
        if (isNaN(ansIdx) || ansIdx < 1 || ansIdx > q.options.length) {
          addError(
            qNum,
            'rightAnswer',
            `Right Answer "${q.rightAnswer}" is not a valid option index (only ${q.options.length} options provided)`
          );
        }
        break;
      }
      case 'MULTICORRECT': {
        if (q.options.length < 2 || q.options.length > 10) {
          addError(qNum, 'options', `MULTICORRECT requires 2–10 options (has ${q.options.length})`);
        }
        const nonEmpty = q.options.filter((o) => !isRichContentEmpty(o.html));
        if (nonEmpty.length !== q.options.length) {
          addError(qNum, 'options', 'All options must have content (no empty options)');
        }
        if (!q.rightAnswer.trim()) {
          addError(qNum, 'rightAnswer', 'Right Answer field is empty');
        } else {
          const indices = parseRightAnswerIndices(q.rightAnswer);
          if (indices.length === 0) {
            addError(qNum, 'rightAnswer', `Right Answer "${q.rightAnswer}" could not be parsed as comma-separated indices`);
          } else {
            const uniqueIndices = new Set(indices);
            if (uniqueIndices.size !== indices.length) {
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
        const ansIdx = parseInt(q.rightAnswer, 10);
        if (isNaN(ansIdx) || ansIdx < 1 || ansIdx > 2) {
          addError(qNum, 'rightAnswer', `Right Answer "${q.rightAnswer}" must be 1 (True) or 2 (False)`);
        }
        break;
      }
      case 'NUMERICAL': {
        if (q.options.length !== 0) {
          addError(qNum, 'options', 'NUMERICAL questions must not have any options');
        }
        if (!q.rightAnswer.trim()) {
          addError(qNum, 'rightAnswer', 'Right Answer is required for NUMERICAL questions');
        } else if (isNaN(parseFloat(q.rightAnswer))) {
          addError(qNum, 'rightAnswer', `Right Answer "${q.rightAnswer}" must be a valid number`);
        }
        break;
      }
      case 'FILLINTHEBLANK': {
        if (q.options.length !== 0) {
          addError(qNum, 'options', 'FILLINTHEBLANK questions must not have any options');
        }
        if (!q.rightAnswer.trim()) {
          addError(qNum, 'rightAnswer', 'Right Answer must not be empty for FILLINTHEBLANK questions');
        }
        break;
      }
    }
  }

  const isValid = Object.keys(errorsByQuestion).length === 0;
  return { isValid, errorsByQuestion, infoNotices };
}
