import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { v4 as uuidv4 } from 'uuid';
import type { Question, QuestionType, Difficulty } from '../types';

export interface ImportResult {
  questions: Question[];
  parseErrors: { rawLineOrRow: string; message: string }[];
}

const VALID_TYPES: QuestionType[] = ['SINGLECORRECT', 'MULTICORRECT', 'NUMERICAL', 'FILLINTHEBLANK', 'TRUE_OR_FALSE'];
const VALID_DIFFICULTIES: Difficulty[] = ['Easy', 'Medium', 'Hard', 'Default'];

function toRich(text: string | undefined | null) {
  const t = text?.trim() ?? '';
  return { html: t ? `<p>${t}</p>` : '', images: [] as [] };
}

function normalizeHeader(h: string): string {
  return h.trim().toUpperCase().replace(/\s+/g, ' ');
}

function rowsToQuestions(rows: Record<string, string>[], questionSetId: string, parseErrors: { rawLineOrRow: string; message: string }[]): Question[] {
  const questions: Question[] = [];

  for (let ri = 0; ri < rows.length; ri++) {
    const row = rows[ri];
    const raw = JSON.stringify(row);

    const qNumberStr = row['S NO.'] ?? row['S NO'] ?? row['Q NO'] ?? String(ri + 1);
    const qNumber = parseInt(qNumberStr, 10);
    if (isNaN(qNumber)) {
      parseErrors.push({ rawLineOrRow: raw, message: `Row ${ri + 1}: Invalid S No. value "${qNumberStr}"` });
      continue;
    }

    const typeRaw = (row['QUESTION TYPE'] ?? '').trim().toUpperCase() as QuestionType;
    const questionType: QuestionType = VALID_TYPES.includes(typeRaw) ? typeRaw : 'SINGLECORRECT';

    const options: { html: string; images: [] }[] = [];
    for (let i = 1; i <= 10; i++) {
      const optKey = `OPTION${i}`;
      const optVal = row[optKey]?.trim();
      if (optVal) {
        options.push(toRich(optVal));
      }
    }

    const difficultyRaw = (row['DIFFICULTY'] ?? '').trim() as Difficulty;
    const difficulty: Difficulty = VALID_DIFFICULTIES.includes(difficultyRaw) ? difficultyRaw : 'Default';

    const tagsRaw = row['TAGS'] ?? '';
    const tags = tagsRaw ? tagsRaw.split(',').map((t) => t.trim()).filter(Boolean) : [];

    questions.push({
      id: uuidv4(),
      questionSetId,
      qNumber,
      subject: row['SUBJECT']?.trim() ?? '',
      topic: row['TOPIC']?.trim() ?? '',
      tags,
      questionType,
      questionText: toRich(row['QUESTION TEXT']),
      options,
      rightAnswer: row['RIGHT ANSWER']?.trim() ?? '',
      explanation: toRich(row['EXPLANATION']),
      correctMarks: parseFloat(row['CORRECT MARKS'] ?? '') || 0,
      negativeMarks: parseFloat(row['NEGATIVE MARKS'] ?? '') || 0,
      difficulty,
      status: 'unvalidated',
      errors: [],
    });
  }

  return questions;
}

export async function parseXlsxOrCsv(file: File, questionSetId: string): Promise<ImportResult> {
  const parseErrors: { rawLineOrRow: string; message: string }[] = [];

  const ext = file.name.split('.').pop()?.toLowerCase();

  if (ext === 'csv') {
    return new Promise((resolve) => {
      Papa.parse<Record<string, string>>(file, {
        header: true,
        skipEmptyLines: true,
        transformHeader: normalizeHeader,
        complete: (result) => {
          const questions = rowsToQuestions(result.data, questionSetId, parseErrors);
          resolve({ questions, parseErrors });
        },
        error: (err: { message: string }) => {
          parseErrors.push({ rawLineOrRow: file.name, message: `CSV parse error: ${err.message}` });
          resolve({ questions: [], parseErrors });
        },
      });
    });
  } else {
    // xlsx
    try {
      const arrayBuffer = await file.arrayBuffer();
      const wb = XLSX.read(arrayBuffer, { type: 'array' });
      const sheetName = wb.SheetNames[0];
      if (!sheetName) {
        parseErrors.push({ rawLineOrRow: file.name, message: 'No sheets found in the file' });
        return { questions: [], parseErrors };
      }
      const ws = wb.Sheets[sheetName];
      const rawRows = XLSX.utils.sheet_to_json<Record<string, string>>(ws, { defval: '' });
      // Normalize headers
      const rows = rawRows.map((row) => {
        const normalized: Record<string, string> = {};
        for (const key of Object.keys(row)) {
          normalized[normalizeHeader(key)] = String(row[key]);
        }
        return normalized;
      });
      const questions = rowsToQuestions(rows, questionSetId, parseErrors);
      return { questions, parseErrors };
    } catch (e) {
      parseErrors.push({ rawLineOrRow: file.name, message: `XLSX parse error: ${String(e)}` });
      return { questions: [], parseErrors };
    }
  }
}
