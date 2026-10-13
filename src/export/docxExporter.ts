import type { QuestionSet, Template, Question, RichContent } from '../types';
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  ImageRun,
} from 'docx';
import { parseHtml } from '../utils/html';
import { toNegativeMarks } from '../utils/marks';

// ── Images ────────────────────────────────────────────────────────────────

type DocxImageType = 'png' | 'jpg' | 'gif' | 'bmp';

function mimeToDocxType(mime: string): DocxImageType | null {
  switch (mime.toLowerCase()) {
    case 'image/png': return 'png';
    case 'image/jpeg':
    case 'image/jpg': return 'jpg';
    case 'image/gif': return 'gif';
    case 'image/bmp': return 'bmp';
    default: return null; // webp, svg, … cannot be embedded in a .docx via ImageRun
  }
}

function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/** Reads pixel dimensions straight from the image header. */
function readImageSize(bytes: Uint8Array, type: DocxImageType): { w: number; h: number } | null {
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  try {
    if (type === 'png' && bytes.length > 24) return { w: dv.getUint32(16), h: dv.getUint32(20) };
    if (type === 'gif' && bytes.length > 10) return { w: dv.getUint16(6, true), h: dv.getUint16(8, true) };
    if (type === 'bmp' && bytes.length > 26) return { w: Math.abs(dv.getInt32(18, true)), h: Math.abs(dv.getInt32(22, true)) };
    if (type === 'jpg') {
      let i = 2;
      while (i + 9 < bytes.length) {
        if (bytes[i] !== 0xff) { i++; continue; }
        const marker = bytes[i + 1];
        if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
          return { h: dv.getUint16(i + 5), w: dv.getUint16(i + 7) };
        }
        i += 2 + dv.getUint16(i + 2);
      }
    }
  } catch {
    /* fall through */
  }
  return null;
}

/** Scales down to fit the page column, preserving aspect ratio. */
function fitSize(w: number, h: number, maxW = 400, maxH = 300): { width: number; height: number } {
  if (!(w > 0) || !(h > 0)) return { width: 200, height: 150 };
  const scale = Math.min(1, maxW / w, maxH / h);
  return { width: Math.max(1, Math.round(w * scale)), height: Math.max(1, Math.round(h * scale)) };
}

function buildImageRun(el: Element, content: RichContent): ImageRun | TextRun {
  const src = el.getAttribute('src') ?? '';
  const alt = el.getAttribute('alt') ?? '';
  const stored = alt ? content.images?.find((img) => img.id === alt) : undefined;

  let base64: string | undefined;
  let mime = stored?.mimeType ?? 'image/png';
  const m = src.match(/^data:([^;,]+)(?:;[^,]*)?;base64,(.*)$/s);
  if (m) {
    mime = m[1];
    base64 = m[2];
  } else if (stored?.base64) {
    base64 = stored.base64;
  }

  const type = mimeToDocxType(mime);
  if (!base64 || !type) {
    return new TextRun({ text: `[image: ${mime} not supported]`, italics: true });
  }

  try {
    const bytes = base64ToUint8Array(base64);
    const dims = readImageSize(bytes, type);
    const size = dims
      ? fitSize(dims.w, dims.h)
      : fitSize(stored?.widthPx ?? 0, stored?.heightPx ?? 0);
    return new ImageRun({ type, data: bytes, transformation: size });
  } catch {
    return new TextRun({ text: '[image]', italics: true });
  }
}

// ── Rich text → docx paragraphs ───────────────────────────────────────────

interface Fmt {
  bold?: boolean;
  italics?: boolean;
  underline?: boolean;
  strike?: boolean;
  code?: boolean;
}

type Run = TextRun | ImageRun;

interface ParaSpec {
  runs: Run[];
  level: number;
}

const BLOCK_TAGS = new Set([
  'p', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'pre',
  'ul', 'ol', 'li', 'hr', 'table',
]);

function inlineRuns(nodes: ArrayLike<Node>, fmt: Fmt, content: RichContent): Run[] {
  const runs: Run[] = [];
  Array.from(nodes).forEach((child) => {
    if (child.nodeType === Node.TEXT_NODE) {
      const text = child.textContent ?? '';
      if (text) {
        runs.push(new TextRun({
          text,
          bold: !!fmt.bold,
          italics: !!fmt.italics,
          underline: fmt.underline ? {} : undefined,
          strike: !!fmt.strike,
          font: fmt.code ? 'Courier New' : undefined,
        }));
      }
    } else if (child.nodeType === Node.ELEMENT_NODE) {
      const el = child as Element;
      const tag = el.tagName.toLowerCase();
      if (tag === 'img') {
        runs.push(buildImageRun(el, content));
      } else if (tag === 'br') {
        runs.push(new TextRun({ break: 1 }));
      } else {
        runs.push(...inlineRuns(el.childNodes, {
          bold: fmt.bold || tag === 'strong' || tag === 'b',
          italics: fmt.italics || tag === 'em' || tag === 'i',
          underline: fmt.underline || tag === 'u',
          strike: fmt.strike || tag === 's' || tag === 'del' || tag === 'strike',
          code: fmt.code || tag === 'code',
        }, content));
      }
    }
  });
  return runs;
}

function isListElement(node: Node): node is Element {
  return node.nodeType === Node.ELEMENT_NODE && ['ul', 'ol'].includes((node as Element).tagName.toLowerCase());
}

function collectBlocks(nodes: ArrayLike<Node>, content: RichContent, level: number, out: ParaSpec[]): void {
  let pending: Node[] = [];
  const flush = () => {
    if (pending.length > 0) {
      const runs = inlineRuns(pending, {}, content);
      if (runs.length > 0) out.push({ runs, level });
    }
    pending = [];
  };

  Array.from(nodes).forEach((child) => {
    if (child.nodeType === Node.TEXT_NODE) {
      if ((child.textContent ?? '').trim() || pending.length > 0) pending.push(child);
      return;
    }
    if (child.nodeType !== Node.ELEMENT_NODE) return;
    const el = child as Element;
    const tag = el.tagName.toLowerCase();

    if (!BLOCK_TAGS.has(tag)) {
      pending.push(el); // inline element at block level (e.g. a bare <img> or <strong>)
      return;
    }
    flush();

    if (tag === 'ul' || tag === 'ol') {
      let n = 0;
      Array.from(el.children).forEach((li) => {
        if (li.tagName.toLowerCase() !== 'li') return;
        n++;
        const own: Node[] = [];
        const nested: Element[] = [];
        li.childNodes.forEach((c) => (isListElement(c) ? nested.push(c) : own.push(c)));

        const itemBlocks: ParaSpec[] = [];
        collectBlocks(own, content, level, itemBlocks);
        if (itemBlocks.length === 0) itemBlocks.push({ runs: [], level });
        itemBlocks[0].runs.unshift(new TextRun({ text: tag === 'ol' ? `${n}. ` : '• ' }));
        out.push(...itemBlocks);

        nested.forEach((list) => collectBlocks([list], content, level + 1, out));
      });
    } else if (tag === 'li' || tag === 'blockquote' || tag === 'div') {
      collectBlocks(el.childNodes, content, level, out);
    } else if (tag === 'table') {
      el.querySelectorAll('tr').forEach((tr) => {
        const cells = Array.from(tr.children).map((c) => (c.textContent ?? '').trim());
        out.push({ runs: [new TextRun({ text: cells.join('  |  ') })], level });
      });
    } else if (tag !== 'hr') {
      // p, h1-h6, pre
      out.push({ runs: inlineRuns(el.childNodes, tag.startsWith('h') ? { bold: true } : {}, content), level });
    }
  });
  flush();
}

function richContentToDocxParagraphs(content: RichContent, prefixLabel?: string): Paragraph[] {
  const prefixRuns: Run[] = prefixLabel ? [new TextRun({ text: `${prefixLabel} `, bold: true })] : [];
  const html = content.html;

  const specs: ParaSpec[] = [];
  if (html && html !== '<p></p>') {
    collectBlocks(parseHtml(html).childNodes, content, 0, specs);
  }

  if (specs.length === 0) {
    return [new Paragraph({ children: [...prefixRuns, new TextRun('')] })];
  }

  specs[0].runs = [...prefixRuns, ...specs[0].runs];
  return specs.map(
    (s) =>
      new Paragraph({
        children: s.runs.length > 0 ? s.runs : [new TextRun('')],
        indent: s.level > 0 ? { left: 360 * s.level } : undefined,
      })
  );
}

// ── Main export function ──────────────────────────────────────────────────

function sanitizeFilename(name: string): string {
  // keep letters/digits/marks of any script; replace everything else
  const cleaned = name
    .normalize('NFC')
    .replace(/[^\p{L}\p{N}\p{M}_-]+/gu, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');
  return cleaned.slice(0, 100);
}

function formatTimestamp(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}`;
}

function labelLine(label: string, value: string): Paragraph {
  return new Paragraph({
    children: [
      new TextRun({ text: `${label} `, bold: true }),
      new TextRun({ text: value, bold: false }),
    ],
    spacing: { after: 80 },
  });
}

function labelRichParagraphs(label: string, content: RichContent): Paragraph[] {
  // Label on the same line as the first paragraph of content
  return richContentToDocxParagraphs(content, label);
}

function questionToDocxChildren(q: Question): Paragraph[] {
  const children: Paragraph[] = [];

  // {QUESTION BEGINS}
  children.push(new Paragraph({
    children: [new TextRun({ text: '{QUESTION BEGINS}', bold: true })],
    spacing: { before: 200, after: 80 },
  }));

  // Scalar fields
  children.push(labelLine('{QUESTION NUMBER}', String(q.qNumber)));
  children.push(labelLine('{SUBJECT}', q.subject || ''));
  children.push(labelLine('{TOPIC}', q.topic || 'N/A'));
  children.push(labelLine('{TAGS}', q.tags.join(', ') || ''));
  children.push(labelLine('{QUESTION TYPE}', q.questionType));

  // {QUESTION TEXT} — rich content
  children.push(...labelRichParagraphs('{QUESTION TEXT}', q.questionText));

  // {OPTION N} — only for types that have options
  if (q.questionType !== 'NUMERICAL' && q.questionType !== 'FILLINTHEBLANK') {
    q.options.forEach((opt, i) => {
      children.push(...labelRichParagraphs(`{OPTION ${i + 1}}`, opt));
    });
  }

  // Other scalar fields
  children.push(labelLine('{RIGHT ANSWER}', q.rightAnswer || ''));
  children.push(...labelRichParagraphs('{EXPLANATION}', q.explanation));
  children.push(labelLine('{CORRECT MARKS}', String(q.correctMarks)));
  children.push(labelLine('{NEGATIVE MARKS}', String(toNegativeMarks(q.negativeMarks))));
  children.push(labelLine('{DIFFICULTY}', q.difficulty));

  // {QUESTION ENDS}
  children.push(new Paragraph({
    children: [new TextRun({ text: '{QUESTION ENDS}', bold: true })],
    spacing: { after: 300 },
  }));

  return children;
}

// The template is not needed to render a paper (all fields are resolved on the
// questions), so a set whose template was deleted can still be exported.
export async function generateDocx(questionSet: QuestionSet, _template?: Template | null): Promise<Blob> {
  const allParagraphs: Paragraph[] = [];

  questionSet.questions
    .slice()
    .sort((a, b) => a.qNumber - b.qNumber)
    .forEach((q) => {
      allParagraphs.push(...questionToDocxChildren(q));
    });

  const doc = new Document({
    sections: [
      {
        children: allParagraphs,
      },
    ],
  });

  return Packer.toBlob(doc);
}

export function getDocxFilename(questionSet: QuestionSet): string {
  const title = sanitizeFilename(questionSet.title || '') || 'QuestionSet';
  const ts = formatTimestamp();
  return `${title}_${ts}.docx`;
}
