import type { QuestionSet, Template, Question, RichContent } from '../types';
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  ImageRun,
} from 'docx';

// ── Rich text → docx paragraphs ───────────────────────────────────────────

function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

interface ParsedNode {
  type: 'text' | 'image' | 'br';
  text?: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  imageId?: string;
  src?: string;
}

function extractNodes(element: Element | ChildNode): ParsedNode[] {
  const nodes: ParsedNode[] = [];
  element.childNodes.forEach((child) => {
    if (child.nodeType === Node.TEXT_NODE) {
      const text = child.textContent ?? '';
      if (text) nodes.push({ type: 'text', text });
    } else if (child.nodeType === Node.ELEMENT_NODE) {
      const el = child as Element;
      const tag = el.tagName.toLowerCase();
      if (tag === 'img') {
        const src = el.getAttribute('src') ?? '';
        const alt = el.getAttribute('alt') ?? '';
        nodes.push({ type: 'image', imageId: alt, src });
      } else if (tag === 'br') {
        nodes.push({ type: 'br' });
      } else {
        const inner = extractNodes(el);
        const bold = ['strong', 'b'].includes(tag);
        const italic = ['em', 'i'].includes(tag);
        const underline = tag === 'u';
        inner.forEach((n) => {
          if (n.type === 'text') {
            nodes.push({ ...n, bold: bold || n.bold, italic: italic || n.italic, underline: underline || n.underline });
          } else {
            nodes.push(n);
          }
        });
      }
    }
  });
  return nodes;
}

export function richContentToDocxParagraphs(content: RichContent, prefixLabel?: string): Paragraph[] {
  const html = content.html;
  const prefixRuns = prefixLabel ? [new TextRun({ text: `${prefixLabel} `, bold: true })] : [];

  if (!html || html === '<p></p>') return [new Paragraph({ children: [...prefixRuns, new TextRun('')] })];

  const div = document.createElement('div');
  div.innerHTML = html;

  const paragraphs: Paragraph[] = [];

  let isFirstPara = true;

  const processBlockElement = (el: Element) => {
    const nodes = extractNodes(el);
    const runs: (TextRun | ImageRun)[] = isFirstPara ? [...prefixRuns] : [];
    isFirstPara = false;

    nodes.forEach((node) => {
      if (node.type === 'text' && node.text) {
        runs.push(new TextRun({
          text: node.text,
          bold: !!node.bold,
          italics: !!node.italic,
          underline: node.underline ? {} : undefined,
        }));
      } else if (node.type === 'image') {
        // Try to find image bytes from the stored images array
        const stored = content.images.find((img) => img.id === node.imageId);
        const src = node.src ?? '';
        let base64Data = stored?.base64;
        let mimeType = stored?.mimeType ?? 'image/png';

        // Fallback: parse from data URL in src
        if (!base64Data && src.startsWith('data:')) {
          const [header, b64] = src.split(',');
          base64Data = b64;
          mimeType = header.match(/:(.*?);/)?.[1] ?? 'image/png';
        }

        if (base64Data) {
          try {
            const bytes = base64ToUint8Array(base64Data);
            runs.push(new ImageRun({
              data: bytes,
              transformation: {
                width: stored?.widthPx ? Math.min(stored.widthPx, 400) : 200,
                height: stored?.heightPx ? Math.min(stored.heightPx, 300) : 150,
              },
              type: mimeType === 'image/png' ? 'png' : mimeType === 'image/gif' ? 'gif' : 'jpg',
            }));
          } catch (_) {
            // If image can't be embedded, insert placeholder text
            runs.push(new TextRun({ text: '[image]', italics: true }));
          }
        }
      }
    });

    if (runs.length > 0) {
      paragraphs.push(new Paragraph({ children: runs }));
    } else {
      paragraphs.push(new Paragraph({ children: [new TextRun('')] }));
    }
  };

  div.childNodes.forEach((child) => {
    if (child.nodeType === Node.ELEMENT_NODE) {
      const el = child as Element;
      const tag = el.tagName.toLowerCase();
      if (['ul', 'ol'].includes(tag)) {
        el.querySelectorAll('li').forEach((li) => {
          const liNodes = extractNodes(li);
          const runs: TextRun[] = liNodes
            .filter((n) => n.type === 'text' && n.text)
            .map((n) => new TextRun({ text: `• ${n.text}`, bold: n.bold, italics: n.italic }));
          
          if (isFirstPara && prefixRuns.length > 0) {
            runs.unshift(...prefixRuns as TextRun[]);
            isFirstPara = false;
          }
          if (runs.length > 0) paragraphs.push(new Paragraph({ children: runs }));
        });
      } else {
        processBlockElement(el);
      }
    } else if (child.nodeType === Node.TEXT_NODE && child.textContent?.trim()) {
      paragraphs.push(new Paragraph({ children: [new TextRun(child.textContent)] }));
    }
  });

  return paragraphs.length > 0 ? paragraphs : [new Paragraph({ children: [new TextRun('')] })];
}

// ── Main export function ──────────────────────────────────────────────────

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9_\-\u0900-\u097F]/g, '_').replace(/_+/g, '_');
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
  children.push(labelLine('{NEGATIVE MARKS}', String(q.negativeMarks)));
  children.push(labelLine('{DIFFICULTY}', q.difficulty));

  // {QUESTION ENDS}
  children.push(new Paragraph({
    children: [new TextRun({ text: '{QUESTION ENDS}', bold: true })],
    spacing: { after: 300 },
  }));

  return children;
}

export async function generateDocx(questionSet: QuestionSet, _template: Template): Promise<Blob> {
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
  const title = sanitizeFilename(questionSet.title || 'QuestionSet');
  const ts = formatTimestamp();
  return `${title}_${ts}.docx`;
}
