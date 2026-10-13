import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { v4 as uuidv4 } from 'uuid';
import type { Question, QuestionType, Difficulty, RichContent } from '../types';
import { textToHtml } from '../utils/html';
import { reconcileOptions, MAX_OPTIONS } from '../utils/resolveLockedFields';
import { toNegativeMarks } from '../utils/marks';
import {
  type ImportResult,
  type ImportWarning,
  type ParseError,
  normalizeDifficulty,
  normalizeRightAnswer,
  normalizeType,
  parseMarks,
  parseTags,
} from './normalize';

export type { ImportResult } from './normalize';

function toRich(text: string | undefined | null): RichContent {
  return { html: textToHtml(text), images: [] };
}

const HEADER_ALIASES: Record<string, string> = {
  'S NO.': 'S NO',
  'S.NO.': 'S NO',
  'S.NO': 'S NO',
  'SNO': 'S NO',
  'SR NO': 'S NO',
  'Q NO': 'S NO',
  'Q NO.': 'S NO',
  'Q.NO': 'S NO',
  'QNO': 'S NO',
  'QUESTION NO': 'S NO',
  'QUESTION NO.': 'S NO',
  'QUESTION NUMBER': 'S NO',
};

function normalizeHeader(h: string): string {
  const key = String(h).replace(/^﻿/, '').trim().toUpperCase().replace(/\s+/g, ' ');
  const option = key.match(/^OPTION ?(\d{1,2})$/);
  if (option) return `OPTION${parseInt(option[1], 10)}`;
  return HEADER_ALIASES[key] ?? key;
}

function rowsToQuestions(
  rows: Record<string, string>[],
  questionSetId: string,
  parseErrors: ParseError[],
  warnings: ImportWarning[]
): Question[] {
  const questions: Question[] = [];

  for (let ri = 0; ri < rows.length; ri++) {
    const row = rows[ri];
    const raw = JSON.stringify(row);
    const cell = (key: string) => (row[key] ?? '').trim();

    const hasNumberColumn = 'S NO' in row;
    const qNumberStr = hasNumberColumn ? cell('S NO') : String(ri + 1);
    const qNumber = /^\d+$/.test(qNumberStr) ? parseInt(qNumberStr, 10) : NaN;
    if (!Number.isInteger(qNumber) || qNumber < 1) {
      parseErrors.push({ rawLineOrRow: raw, message: `Row ${ri + 1}: Invalid S No. value "${qNumberStr}"` });
      continue;
    }
    const warn = (message: string) => warnings.push({ qNumber, message: `Q${qNumber}: ${message}` });

    const typeRaw = cell('QUESTION TYPE');
    const parsedType = normalizeType(typeRaw);
    if (typeRaw && !parsedType) warn(`Unknown question type "${typeRaw}" — defaulted to SINGLECORRECT`);
    const questionType: QuestionType = parsedType ?? 'SINGLECORRECT';

    const diffRaw = cell('DIFFICULTY');
    const parsedDifficulty = normalizeDifficulty(diffRaw);
    if (diffRaw && !parsedDifficulty) warn(`Unknown difficulty "${diffRaw}" — defaulted to Default`);
    const difficulty: Difficulty = parsedDifficulty ?? 'Default';

    // Keep option positions: a blank OPTION2 stays blank (and is flagged by
    // validation) instead of shifting OPTION3 into its place.
    let lastOption = 0;
    for (let i = 1; i <= MAX_OPTIONS; i++) if (cell(`OPTION${i}`)) lastOption = i;
    const rawOptions: RichContent[] = [];
    for (let i = 1; i <= lastOption; i++) rawOptions.push(toRich(cell(`OPTION${i}`)));

    const correctMarks = parseMarks(cell('CORRECT MARKS'));
    const negativeMarks = parseMarks(cell('NEGATIVE MARKS'));
    if (correctMarks !== undefined && Number.isNaN(correctMarks)) warn('Correct Marks is not a number');
    if (negativeMarks !== undefined && Number.isNaN(negativeMarks)) warn('Negative Marks is not a number');

    const topic = cell('TOPIC');

    questions.push({
      id: uuidv4(),
      questionSetId,
      qNumber,
      subject: cell('SUBJECT'),
      topic: topic === 'N/A' ? '' : topic,
      tags: parseTags(cell('TAGS')),
      questionType,
      questionText: toRich(row['QUESTION TEXT']),
      options: reconcileOptions(questionType, rawOptions),
      rightAnswer: normalizeRightAnswer(questionType, cell('RIGHT ANSWER')),
      explanation: toRich(row['EXPLANATION']),
      correctMarks: correctMarks ?? 1,
      negativeMarks: toNegativeMarks(negativeMarks ?? 0),
      difficulty,
      status: 'unvalidated',
      errors: [],
    });
  }

  return questions;
}

export async function parseXlsxOrCsv(file: File, questionSetId: string): Promise<ImportResult> {
  const parseErrors: ParseError[] = [];
  const warnings: ImportWarning[] = [];

  const ext = file.name.split('.').pop()?.toLowerCase();

  if (ext === 'csv') {
    return new Promise((resolve) => {
      Papa.parse<Record<string, string>>(file, {
        header: true,
        skipEmptyLines: true,
        transformHeader: normalizeHeader,
        complete: (result) => {
          const questions = rowsToQuestions(result.data, questionSetId, parseErrors, warnings);
          resolve({ questions, parseErrors, warnings });
        },
        error: (err: { message: string }) => {
          parseErrors.push({ rawLineOrRow: file.name, message: `CSV parse error: ${err.message}` });
          resolve({ questions: [], parseErrors, warnings });
        },
      });
    });
  }

  // xlsx
  try {
    const arrayBuffer = await file.arrayBuffer();
    const wb = XLSX.read(arrayBuffer, { type: 'array' });
    const sheetName = wb.SheetNames[0];
    if (!sheetName) {
      parseErrors.push({ rawLineOrRow: file.name, message: 'No sheets found in the file' });
      return { questions: [], parseErrors, warnings };
    }
    const ws = wb.Sheets[sheetName];
    const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '' });
    // Normalize headers; build rows on a null-prototype object so crafted
    // header names such as "__proto__" cannot pollute anything.
    const rows = rawRows.map((row) => {
      const normalized: Record<string, string> = Object.create(null);
      for (const key of Object.keys(row)) {
        normalized[normalizeHeader(key)] = String(row[key] ?? '');
      }
      return normalized;
    });
    if (wb.SheetNames.length > 1) {
      warnings.push({
        qNumber: 0,
        message: `Only the first sheet ("${sheetName}") was read; ${wb.SheetNames.length - 1} other sheet(s) were ignored`,
      });
    }
    const questions = rowsToQuestions(rows, questionSetId, parseErrors, warnings);
    return { questions, parseErrors, warnings };
  } catch (e) {
    parseErrors.push({ rawLineOrRow: file.name, message: `XLSX parse error: ${String(e)}` });
    return { questions: [], parseErrors, warnings };
  }
}
