import { saveAs } from 'file-saver';
import type { Question, QuestionSet } from '../types';
import { generateDocx } from '../export/docxExporter';

const rich = (text: string) => ({ html: `<p>${text}</p>`, images: [] });

function sampleQuestions(): Question[] {
  const base = {
    questionSetId: 'sample',
    topic: 'Sample topic',
    tags: ['sample'],
    difficulty: 'Medium' as const,
    explanation: rich('Short explanation of the answer.'),
    status: 'unvalidated' as const,
    errors: [],
  };
  return [
    {
      ...base, id: 's1', qNumber: 1, subject: 'Mathematics', questionType: 'SINGLECORRECT',
      questionText: rich('What is 2 + 2?'),
      options: ['3', '4', '5', '6'].map(rich), rightAnswer: '2',
      correctMarks: 4, negativeMarks: -1,
    },
    {
      ...base, id: 's2', qNumber: 2, subject: 'Mathematics', questionType: 'MULTICORRECT',
      questionText: rich('Which of these are even numbers?'),
      options: ['2', '3', '4', '7'].map(rich), rightAnswer: '1,3',
      correctMarks: 4, negativeMarks: -1,
    },
    {
      ...base, id: 's3', qNumber: 3, subject: 'Mathematics', questionType: 'NUMERICAL',
      questionText: rich('What is the square root of 81?'),
      options: [], rightAnswer: '9',
      correctMarks: 4, negativeMarks: 0,
    },
  ];
}

/** A ready-to-edit .docx in exactly the format the exporter writes and the importer reads. */
export async function downloadSampleDocx(): Promise<void> {
  const set: QuestionSet = {
    id: 'sample', templateId: 'sample', title: 'Sample', createdAt: new Date().toISOString(),
    questions: sampleQuestions(),
  };
  saveAs(await generateDocx(set, null), 'PaperForge_sample.docx');
}

const CSV_HEADER = [
  'S No.', 'Subject', 'Topic', 'Tags', 'Question Type', 'Question Text',
  'Option1', 'Option2', 'Option3', 'Option4', 'Right Answer', 'Explanation',
  'Correct Marks', 'Negative Marks', 'Difficulty',
];

const csvCell = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);

/** A sample spreadsheet with the column names the importer expects. */
export function downloadSampleCsv(): void {
  const rows = [
    ['1', 'Mathematics', 'Arithmetic', 'sample', 'SINGLECORRECT', 'What is 2 + 2?', '3', '4', '5', '6', '2', 'Because 2 + 2 = 4.', '4', '1', 'Medium'],
    ['2', 'Mathematics', 'Arithmetic', 'sample', 'MULTICORRECT', 'Which of these are even numbers?', '2', '3', '4', '7', '1,3', '', '4', '1', 'Medium'],
    ['3', 'Mathematics', 'Roots', 'sample', 'NUMERICAL', 'What is the square root of 81?', '', '', '', '', '9', '', '4', '0', 'Easy'],
  ];
  const text = [CSV_HEADER, ...rows].map((r) => r.map(csvCell).join(',')).join('\r\n') + '\r\n';
  // BOM so Excel opens it as UTF-8
  saveAs(new Blob(['﻿', text], { type: 'text/csv;charset=utf-8' }), 'PaperForge_sample.csv');
}
