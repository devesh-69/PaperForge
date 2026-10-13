import { v4 as uuidv4 } from 'uuid';
import type {
  DetailField,
  DividerElement,
  DocKind,
  Letterhead,
  LogoElement,
  PaperDoc,
  TextElement,
  TextStyle,
} from './types';

/** Fonts Word has on virtually every machine (a .docx only uses fonts installed where it is opened). */
export const FONT_OPTIONS: { label: string; css: string }[] = [
  { label: 'Times New Roman', css: '"Times New Roman", Times, serif' },
  { label: 'Arial', css: 'Arial, Helvetica, sans-serif' },
  { label: 'Calibri', css: 'Calibri, Carlito, "Segoe UI", sans-serif' },
  { label: 'Cambria', css: 'Cambria, Caladea, Georgia, serif' },
  { label: 'Georgia', css: 'Georgia, serif' },
  { label: 'Verdana', css: 'Verdana, Geneva, sans-serif' },
  { label: 'Tahoma', css: 'Tahoma, Geneva, sans-serif' },
  { label: 'Trebuchet MS', css: '"Trebuchet MS", sans-serif' },
  { label: 'Garamond', css: 'Garamond, "EB Garamond", serif' },
  { label: 'Courier New', css: '"Courier New", Courier, monospace' },
];

export function fontCss(family: string): string {
  return FONT_OPTIONS.find((f) => f.label === family)?.css ?? `"${family}", serif`;
}

const DEFAULT_PALETTE = ['#7030a0', '#f97316', '#0a0a0a', '#1d4ed8', '#15803d', '#b91c1c'];

export const MAX_PALETTE = 8;

/** Longest side (px) logos and question images are stored at, to keep storage small. */
export const LOGO_MAX_PX = 800;
export const QUESTION_IMAGE_MAX_PX = 1200;

function newTextStyle(over: Partial<TextStyle> = {}): TextStyle {
  return {
    fontFamily: 'Times New Roman',
    sizePt: 12,
    bold: false,
    italic: false,
    underline: false,
    color: '#000000',
    align: 'center',
    spaceBeforePt: 0,
    spaceAfterPt: 4,
    ...over,
  };
}

export function newTextElement(label = 'Text line', text = '', over: Partial<TextStyle> = {}): TextElement {
  return { id: uuidv4(), type: 'text', label, text, style: newTextStyle(over) };
}

export function newLogoElement(): LogoElement {
  return { id: uuidv4(), type: 'logo', label: 'Logo', widthMm: 25, align: 'center', placement: 'above', spaceBeforePt: 0, spaceAfterPt: 4 };
}

export function newDividerElement(color = '#000000'): DividerElement {
  return {
    id: uuidv4(),
    type: 'divider',
    label: 'Divider line',
    thicknessPt: 1.5,
    lineStyle: 'single',
    color,
    spaceBeforePt: 2,
    spaceAfterPt: 8,
  };
}

export function newDetailField(label = 'New field'): DetailField {
  return { id: uuidv4(), label, kind: 'text' };
}

function baseBody(): Letterhead['body'] {
  return { fontFamily: 'Times New Roman', textSizePt: 12, questionSizePt: 14, color: '#000000', rule: true, ruleColor: '#000000' };
}

export type PresetKey = 'letter' | 'letterBlank' | 'exam' | 'examBlank';

export const PRESETS: { key: PresetKey; kind: DocKind; title: string; description: string }[] = [
  { key: 'letter', kind: 'letter', title: 'Official letter', description: 'Logo beside the name, address line, divider and a free-text body.' },
  { key: 'letterBlank', kind: 'letter', title: 'Blank letterhead', description: 'Start from nothing and add your own elements.' },
  { key: 'exam', kind: 'paper', title: 'Exam paper', description: 'School name, exam title, details table, instructions and questions.' },
  { key: 'examBlank', kind: 'paper', title: 'Blank paper format', description: 'Start from nothing and add your own elements.' },
];

export const isPresetKey = (v: string | null): v is PresetKey => PRESETS.some((p) => p.key === v);

/** A fresh letterhead / paper format (not saved yet). */
export function createLetterhead(preset: PresetKey): Letterhead {
  const now = new Date().toISOString();
  const kind: DocKind = preset === 'exam' || preset === 'examBlank' ? 'paper' : 'letter';
  const base: Letterhead = {
    id: uuidv4(),
    name: '',
    kind,
    tags: [],
    defaultBody: '',
    placement: 'body',
    page: { size: 'A4', marginMm: 25.4 },
    palette: [...DEFAULT_PALETTE],
    bandColor: null,
    frame: { enabled: false, color: '#0a0a0a', widthPt: 1 },
    elements: [],
    detailFields: [],
    body: baseBody(),
    instructionsHeading: 'Instructions -',
    defaultInstructions: [],
    maxMarks: { enabled: false, label: 'Maximum Marks' },
    viva: { enabled: false, label: 'Viva' },
    marksUnit: 'M',
    createdAt: now,
    updatedAt: now,
  };

  if (preset === 'exam') {
    return {
      ...base,
      name: 'Exam paper',
      fileNamePattern: '{Subject Code} {Subject}',
      elements: [
        newTextElement('School name', 'Your School Name', {
          sizePt: 22, bold: true, color: '#7030a0', spaceAfterPt: 8,
        }),
        newTextElement('Centre code', 'Center: {Center}', { sizePt: 18, bold: true, spaceAfterPt: 0 }),
        newTextElement('Exam title', 'Practical Exam ({Level}) – {Month} {Year}', { sizePt: 14, bold: true, spaceAfterPt: 4 }),
        newDividerElement('#000000'),
      ],
      detailFields: [
        { id: uuidv4(), label: 'Subject', kind: 'text' },
        { id: uuidv4(), label: 'Subject Code', kind: 'text' },
        { id: uuidv4(), label: 'Time', kind: 'timeRange' },
        { id: uuidv4(), label: 'Date', kind: 'date' },
      ],
      defaultInstructions: ['Attempt any two from the given questions.', 'Write your roll number, subject code, and date on the answer book paper.'],
      maxMarks: { enabled: true, label: 'Maximum Marks' },
      viva: { enabled: true, label: 'Viva' },
    };
  }

  if (preset === 'letter') {
    return {
      ...base,
      name: 'Official letter',
      placement: 'header',
      elements: [
        { ...newLogoElement(), placement: 'left', widthMm: 22 },
        newTextElement('Organisation name', 'Your Organisation Name', { sizePt: 20, bold: true, color: '#7030a0', spaceAfterPt: 2 }),
        newTextElement('Tagline', 'Excellence in everything we do', { sizePt: 11, italic: true, color: '#6b7280', spaceAfterPt: 2 }),
        newTextElement('Address', 'Street address, City – 000000', { sizePt: 10, spaceAfterPt: 0 }),
        newTextElement('Contact', 'Phone: 00000 00000  |  Email: info@example.com', { sizePt: 10, spaceAfterPt: 0 }),
        newDividerElement('#f97316'),
      ],
      detailFields: [
        { id: uuidv4(), label: 'Ref. No.', kind: 'text' },
        { id: uuidv4(), label: 'Date', kind: 'date' },
      ],
      body: { ...baseBody(), fontFamily: 'Calibri', textSizePt: 11 },
    };
  }

  return { ...base, name: kind === 'paper' ? 'Blank paper format' : 'Blank letterhead' };
}

export function createPaperDoc(lh: Letterhead): PaperDoc {
  const now = new Date().toISOString();
  return {
    id: uuidv4(),
    letterheadId: lh.id,
    kind: lh.kind,
    title: '',
    fields: {},
    details: {},
    instructions: [...lh.defaultInstructions],
    maxMarks: '',
    questions: lh.kind === 'paper' ? [1, 2, 3].map(() => ({ id: uuidv4(), text: '', marks: '' })) : [],
    vivaMarks: '',
    letterBody: lh.kind === 'letter' ? lh.defaultBody : '',
    createdAt: now,
    updatedAt: now,
  };
}
