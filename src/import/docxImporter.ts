import mammoth from 'mammoth';
import { v4 as uuidv4 } from 'uuid';
import type { Question, QuestionType, Difficulty, RichContent } from '../types';
import { escapeHtml, parseHtml, textToHtml } from '../utils/html';
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

// Only these exact markers are field boundaries, so ordinary text such as
// "{1}", "{x}" or "{a, b}" in a question is never mistaken for one.
const KNOWN_FIELDS = [
  'QUESTION BEGINS',
  'QUESTION ENDS',
  'QUESTION NUMBER',
  'SUBJECT',
  'TOPIC',
  'TAGS',
  'QUESTION TYPE',
  'QUESTION TEXT',
  'RIGHT ANSWER',
  'EXPLANATION',
  'CORRECT MARKS',
  'NEGATIVE MARKS',
  'DIFFICULTY',
];
const MARKER_SOURCE = `\\{\\s*(${KNOWN_FIELDS.join('|')}|OPTION\\s*\\d{1,2})\\s*\\}`;
const LEADING_MARKER = new RegExp(`^\\s*${MARKER_SOURCE}`, 'i');
const ANY_MARKER = new RegExp(MARKER_SOURCE, 'gi');

function fieldName(raw: string): string {
  return raw.trim().toUpperCase().replace(/\s+/g, ' ').replace(/^OPTION ?(\d+)$/, 'OPTION $1');
}

interface FieldValue {
  htmlParts: string[];
  textParts: string[];
}

type FieldMap = Map<string, FieldValue>;

function collectTextNodes(node: Node, acc: Text[]): void {
  node.childNodes.forEach((c) => {
    if (c.nodeType === Node.TEXT_NODE) acc.push(c as Text);
    else collectTextNodes(c, acc);
  });
}

/** Removes the first `count` characters of an element's text, across text nodes. */
function removeLeadingChars(block: Element, count: number): void {
  const nodes: Text[] = [];
  collectTextNodes(block, nodes);
  let remaining = count;
  for (const t of nodes) {
    if (remaining <= 0) break;
    const take = Math.min(remaining, t.data.length);
    t.data = t.data.slice(take);
    remaining -= take;
  }
  // trim whitespace left at the start of the content
  for (const t of nodes) {
    if (t.data.trim() === '' && t.data !== '') { t.data = ''; continue; }
    t.data = t.data.replace(/^\s+/, '');
    if (t.data) break;
  }
  // drop inline wrappers (e.g. the bold <strong>) that only held the marker
  const prune = (el: Element) => {
    Array.from(el.children).forEach((c) => {
      prune(c);
      const tag = c.tagName.toLowerCase();
      if (tag !== 'img' && tag !== 'br' && !(c.textContent ?? '').trim() && !c.querySelector('img')) c.remove();
    });
  };
  prune(block);
}

function hasContent(el: Element): boolean {
  return (el.textContent ?? '').trim() !== '' || el.querySelector('img') !== null;
}

function pushBlock(field: FieldValue, block: Element): void {
  if (!hasContent(block)) return;
  field.htmlParts.push(block.outerHTML);
  field.textParts.push((block.textContent ?? '').trim());
}

function startField(fields: FieldMap, name: string): FieldValue {
  const f: FieldValue = { htmlParts: [], textParts: [] };
  fields.set(name, f);
  return f;
}

function fieldText(fields: FieldMap, name: string): string {
  return (fields.get(name)?.textParts ?? []).join(' ').replace(/\s+/g, ' ').trim();
}

function fieldRich(fields: FieldMap, name: string): RichContent {
  return { html: (fields.get(name)?.htmlParts ?? []).join(''), images: [] };
}

function buildQuestion(
  fields: FieldMap,
  questionSetId: string,
  parseErrors: ParseError[],
  warnings: ImportWarning[]
): Question | null {
  const qNumberStr = fieldText(fields, 'QUESTION NUMBER');
  const qNumber = /^\d+$/.test(qNumberStr) ? parseInt(qNumberStr, 10) : NaN;
  if (!Number.isInteger(qNumber) || qNumber < 1) {
    parseErrors.push({ rawLineOrRow: `{QUESTION NUMBER} ${qNumberStr}`, message: `Invalid question number: "${qNumberStr}"` });
    return null;
  }

  const warn = (message: string) => warnings.push({ qNumber, message: `Q${qNumber}: ${message}` });

  const typeRaw = fieldText(fields, 'QUESTION TYPE');
  let questionType: QuestionType = normalizeType(typeRaw) ?? 'SINGLECORRECT';
  if (typeRaw && !normalizeType(typeRaw)) {
    warn(`Unknown question type "${typeRaw}" — defaulted to SINGLECORRECT`);
    questionType = 'SINGLECORRECT';
  }

  const diffRaw = fieldText(fields, 'DIFFICULTY');
  const difficulty: Difficulty = normalizeDifficulty(diffRaw) ?? 'Default';
  if (diffRaw && !normalizeDifficulty(diffRaw)) warn(`Unknown difficulty "${diffRaw}" — defaulted to Default`);

  const correctMarks = parseMarks(fieldText(fields, 'CORRECT MARKS'));
  const negativeMarks = parseMarks(fieldText(fields, 'NEGATIVE MARKS'));
  if (correctMarks !== undefined && Number.isNaN(correctMarks)) warn('Correct Marks is not a number');
  if (negativeMarks !== undefined && Number.isNaN(negativeMarks)) warn('Negative Marks is not a number');

  // keep option positions so the right-answer indices still line up
  let lastOption = 0;
  for (let i = 1; i <= MAX_OPTIONS; i++) if (fields.has(`OPTION ${i}`)) lastOption = i;
  const rawOptions: RichContent[] = [];
  for (let i = 1; i <= lastOption; i++) rawOptions.push(fieldRich(fields, `OPTION ${i}`));

  const topic = fieldText(fields, 'TOPIC');

  return {
    id: uuidv4(),
    questionSetId,
    qNumber,
    subject: fieldText(fields, 'SUBJECT'),
    topic: topic === 'N/A' ? '' : topic,
    tags: parseTags(fieldText(fields, 'TAGS')),
    questionType,
    questionText: fieldRich(fields, 'QUESTION TEXT'),
    options: reconcileOptions(questionType, rawOptions),
    rightAnswer: normalizeRightAnswer(questionType, fieldText(fields, 'RIGHT ANSWER')),
    explanation: fieldRich(fields, 'EXPLANATION'),
    correctMarks: correctMarks ?? 1,
    negativeMarks: toNegativeMarks(negativeMarks ?? 0),
    difficulty,
    status: 'unvalidated',
    errors: [],
  };
}

export async function parseDocx(file: File, questionSetId: string): Promise<ImportResult> {
  const parseErrors: ParseError[] = [];
  const warnings: ImportWarning[] = [];
  const questions: Question[] = [];

  let html = '';
  try {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.convertToHtml({ arrayBuffer });
    html = result.value;
  } catch (e) {
    parseErrors.push({ rawLineOrRow: file.name, message: `Failed to read file: ${String(e)}` });
    return { questions, parseErrors, warnings };
  }

  // zero-width spaces that Word may add
  html = html.replace(/​/g, '');

  const blocks = Array.from(parseHtml(html).children);

  // parser state lives in an object so closures and the loop see the same values
  const st: { fields: FieldMap | null; current: FieldValue | null } = { fields: null, current: null };

  const finishQuestion = () => {
    if (st.fields) {
      const q = buildQuestion(st.fields, questionSetId, parseErrors, warnings);
      if (q) questions.push(q);
    }
    st.fields = null;
    st.current = null;
  };

  for (const block of blocks) {
    const text = block.textContent ?? '';
    const markers = Array.from(text.matchAll(ANY_MARKER));

    if (markers.length === 0) {
      if (st.fields && st.current) pushBlock(st.current, block); // continuation of the current field
      continue;
    }

    const leading = text.match(LEADING_MARKER);

    if (markers.length === 1 && leading) {
      const name = fieldName(leading[1]);
      if (name === 'QUESTION BEGINS') {
        finishQuestion();
        st.fields = new Map();
        continue;
      }
      if (name === 'QUESTION ENDS') {
        finishQuestion();
        continue;
      }
      if (!st.fields) continue; // text outside a question
      removeLeadingChars(block, leading[0].length);
      st.current = startField(st.fields, name);
      pushBlock(st.current, block);
      continue;
    }

    // Several markers in one paragraph (or a marker mid-paragraph): split as plain text.
    // split() with one capture group => [before, name1, value1, name2, value2, ...]
    const parts = text.split(new RegExp(MARKER_SOURCE, 'i'));
    if (st.fields && st.current && parts[0].trim()) {
      st.current.htmlParts.push(`<p>${escapeHtml(parts[0].trim())}</p>`);
      st.current.textParts.push(parts[0].trim());
    }
    for (let i = 1; i < parts.length; i += 2) {
      const name = fieldName(parts[i]);
      const value = (parts[i + 1] ?? '').trim();
      if (name === 'QUESTION BEGINS') {
        finishQuestion();
        st.fields = new Map();
      } else if (name === 'QUESTION ENDS') {
        finishQuestion();
      } else if (st.fields) {
        st.current = startField(st.fields, name);
        if (value) {
          st.current.htmlParts.push(textToHtml(value));
          st.current.textParts.push(value);
        }
      }
    }
  }
  finishQuestion();

  return { questions, parseErrors, warnings };
}
