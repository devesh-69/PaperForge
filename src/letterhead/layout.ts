// Built by Devesh Tatkare · deveshtatkare.com
//
// One neutral layout model, built from a Letterhead + PaperDoc, that the
// on-screen preview, the print/PDF page and the .docx export all render. Because
// they share it, the preview cannot drift away from what Word receives.

import type { Block, BuiltDocument, DetailsBlock, GroupBlock, ImageBlock, PageGeometry, ParaBlock, Run } from './blocks';
import type { AssetUrls } from './assets';
import { letterBodyToHtml, richHasContent, richHtmlToBlocks } from './richText';
import { fillTokens, splitTokens } from './tokens';
import type { Letterhead, LogoElement, PaperDoc, PaperQuestion, TextElement } from './types';

export type { Block, BuiltDocument, DetailsBlock, GroupBlock, ImageBlock, PageGeometry, ParaBlock, Run } from './blocks';
export type {
  ListInfo, RowBlock, RuleBlock, TableBlock, TableCellData,
} from './blocks';

const PX_PER_MM = 96 / 25.4;
const mmToPx = (mm: number) => mm * PX_PER_MM;
export const mmToTwips = (mm: number) => Math.round((mm / 25.4) * 1440);

const PAGE_PX = { A4: { w: 794, h: 1123 }, Letter: { w: 816, h: 1056 } } as const;
export const PAGE_TWIPS = { A4: { w: 11906, h: 16838 }, Letter: { w: 12240, h: 15840 } } as const;

function pageGeometry(lh: Letterhead): PageGeometry {
  const p = PAGE_PX[lh.page.size];
  const marginPx = mmToPx(lh.page.marginMm);
  return { widthPx: p.w, heightPx: p.h, marginPx, contentWidthPx: p.w - marginPx * 2 };
}

const IMAGE_FRACTION = { S: 0.35, M: 0.55, L: 0.8, Full: 1 } as const;
const QUESTION_IMAGE_INDENT_PX = 37.8; // 1 cm
/** a logo beside the heading may use at most this share of the text width */
const MAX_ROW_LOGO_SHARE = 0.4;
const ROW_GAP_PX = 14;

// ── value formatting ────────────────────────────────────────────────────────

export function formatDate(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : iso;
}

function formatTime(hhmm: string): string {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm);
  if (!m) return '';
  const h = Number(m[1]);
  const ap = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${String(h12).padStart(2, '0')}:${m[2]} ${ap}`;
}

export function formatTimeRange(value: string): string {
  const [a, b] = value.split('|');
  const from = formatTime(a ?? '');
  const to = formatTime(b ?? '');
  if (from && to) return `${from} to ${to}`;
  return from || to;
}

function formatMarks(marks: string, unit: string): string {
  return `(${marks.trim() || '0'} ${unit})`.replace(/\s+\)/, ')');
}

function questionHasContent(q: PaperQuestion): boolean {
  return !!q.text.trim() || !!q.image;
}

// ── builders ────────────────────────────────────────────────────────────────

type Mode = 'preview' | 'export';

/** Splits a (token-bearing) string into runs; unfilled tokens become placeholders in preview mode. */
function textRuns(
  text: string,
  values: Record<string, string>,
  mode: Mode,
  fmt: Pick<Run, 'bold' | 'italic' | 'underline' | 'color'>,
): Run[] {
  if (mode === 'export') {
    const t = fillTokens(text, values);
    return t ? [{ text: t, ...fmt }] : [];
  }
  return splitTokens(text, values).map((p) => ({ text: p.text, ...fmt, placeholder: p.empty || undefined }));
}

function valueRuns(value: string, mode: Mode, hint: string, bold: boolean): Run[] {
  if (value) return [{ text: value, bold }];
  return mode === 'preview' ? [{ text: hint, placeholder: true }] : [];
}

const NO_ASSETS: AssetUrls = new Map();

const lines = (text: string): string[] => text.split(/\r?\n/);

/** A text element becomes one paragraph per line; blank lines (and lines whose tokens are all empty) are dropped. */
function textBlocks(el: TextElement, values: Record<string, string>, mode: Mode): ParaBlock[] {
  const s = el.style;
  const fmt = { bold: s.bold, italic: s.italic, underline: s.underline };
  const ls = lines(el.text);
  const out: ParaBlock[] = [];
  ls.forEach((line, i) => {
    const runs = textRuns(line, values, mode, fmt);
    if (runs.length === 0) return;
    out.push({
      kind: 'para',
      runs,
      fontFamily: s.fontFamily,
      sizePt: s.sizePt,
      color: s.color,
      align: s.align,
      spaceBeforePt: i === 0 ? s.spaceBeforePt : 0,
      spaceAfterPt: i === ls.length - 1 ? s.spaceAfterPt : 0,
    });
  });
  return out;
}

function logoImage(el: LogoElement, assets: AssetUrls, maxWidthPx: number): ImageBlock | null {
  const dataUrl = el.assetId ? assets.get(el.assetId) : undefined;
  if (!dataUrl || !el.naturalW || !el.naturalH || !el.mimeType) return null;
  // never wider than the space it has (or Word would clip it)
  const widthPx = Math.min(Math.max(8, mmToPx(el.widthMm)), maxWidthPx);
  return {
    kind: 'image',
    dataUrl,
    mimeType: el.mimeType,
    widthPx,
    heightPx: (widthPx * el.naturalH) / el.naturalW,
    align: el.align,
    indentPx: 0,
    spaceBeforePt: el.spaceBeforePt,
    spaceAfterPt: el.spaceAfterPt,
  };
}

function buildLetterheadGroup(lh: Letterhead, doc: PaperDoc, mode: Mode, geo: PageGeometry, assets: AssetUrls): GroupBlock | null {
  const blocks: Block[] = [];
  const els = lh.elements;

  for (let i = 0; i < els.length; i++) {
    const el = els[i];
    if (el.type === 'logo') {
      const placement = el.placement ?? 'above';
      const img = logoImage(el, assets, placement === 'above' ? geo.contentWidthPx : geo.contentWidthPx * MAX_ROW_LOGO_SHARE);
      if (!img) continue;
      if (placement !== 'above') {
        // the logo shares a row with the text lines that follow it
        const heading: Block[] = [];
        let j = i + 1;
        while (j < els.length && els[j].type === 'text') {
          heading.push(...textBlocks(els[j] as TextElement, doc.fields, mode));
          j++;
        }
        if (heading.length > 0) {
          blocks.push({ kind: 'row', side: placement, logo: img, blocks: heading, gapPx: ROW_GAP_PX });
          i = j - 1;
          continue;
        }
      }
      blocks.push(img);
    } else if (el.type === 'divider') {
      blocks.push({
        kind: 'rule',
        thicknessPt: el.thicknessPt,
        lineStyle: el.lineStyle,
        color: el.color,
        spaceBeforePt: el.spaceBeforePt,
        spaceAfterPt: el.spaceAfterPt,
      });
    } else {
      blocks.push(...textBlocks(el, doc.fields, mode));
    }
  }

  if (blocks.length === 0) return null;
  return {
    kind: 'group',
    blocks,
    band: lh.bandColor,
    frame: lh.frame.enabled ? { color: lh.frame.color, widthPt: lh.frame.widthPt } : null,
  };
}

function buildDetails(lh: Letterhead, doc: PaperDoc, mode: Mode): DetailsBlock | null {
  if (lh.detailFields.length === 0) return null;
  const cells: Run[][] = lh.detailFields.map((f) => {
    const raw = doc.details[f.id] ?? '';
    const value = f.kind === 'date' ? formatDate(raw) : f.kind === 'timeRange' ? formatTimeRange(raw) : raw.trim();
    return [{ text: `${f.label}: ` }, ...valueRuns(value, mode, f.label.toLowerCase(), true)];
  });
  const rows: [Run[], Run[]][] = [];
  for (let i = 0; i < cells.length; i += 2) rows.push([cells[i], cells[i + 1] ?? []]);
  return {
    kind: 'details',
    rows,
    fontFamily: lh.body.fontFamily,
    sizePt: lh.body.textSizePt,
    color: lh.body.color,
    spaceAfterPt: 8,
  };
}

function buildPaperBody(lh: Letterhead, doc: PaperDoc, mode: Mode, geo: PageGeometry, assets: AssetUrls): Block[] {
  const b = lh.body;
  const out: Block[] = [];
  const para = (p: Partial<ParaBlock> & Pick<ParaBlock, 'runs'>): ParaBlock => ({
    kind: 'para',
    fontFamily: b.fontFamily,
    sizePt: b.textSizePt,
    color: b.color,
    align: 'left',
    spaceBeforePt: 0,
    spaceAfterPt: 0,
    ...p,
  });
  const bullet = { kind: 'bullet' as const, level: 0, listId: 'instructions', number: 1 };

  const heading = lh.instructionsHeading.trim();
  const instr = doc.instructions.map((s) => s.trim()).filter(Boolean);
  const showMax = lh.maxMarks.enabled;
  if (heading && (instr.length > 0 || showMax)) {
    out.push(para({ runs: [{ text: heading, bold: true }], spaceAfterPt: 6 }));
  }
  for (const s of instr) out.push(para({ runs: [{ text: s }], list: bullet }));
  if (showMax) {
    const v = doc.maxMarks.trim();
    out.push(
      para({
        runs: [{ text: `${lh.maxMarks.label}: `, bold: true }, ...valueRuns(v, mode, 'marks', true)],
        list: bullet,
      }),
    );
  }
  if (b.rule) {
    out.push({ kind: 'rule', thicknessPt: 1, lineStyle: 'single', color: b.ruleColor, spaceBeforePt: 8, spaceAfterPt: 16 });
  }

  const qs = doc.questions.filter(questionHasContent);
  const gap = Math.round(b.questionSizePt * 2.3);
  if (qs.length === 0 && mode === 'preview') {
    out.push(para({ runs: [{ text: 'Questions appear here', placeholder: true }], sizePt: b.questionSizePt, spaceAfterPt: gap }));
  }
  qs.forEach((q, i) => {
    const hasImg = !!q.image;
    out.push(
      para({
        runs: [{ text: `(Q${i + 1})`, bold: true }, ...(q.text.trim() ? [{ text: ` ${q.text.trim()}` }] : [])],
        rightRuns: [{ text: formatMarks(q.marks, lh.marksUnit) }],
        sizePt: b.questionSizePt,
        spaceAfterPt: hasImg ? 0 : gap,
      }),
    );
    const imageUrl = q.image ? assets.get(q.image.assetId) : undefined;
    if (q.image && imageUrl) {
      const avail = geo.contentWidthPx - QUESTION_IMAGE_INDENT_PX;
      const widthPx = avail * IMAGE_FRACTION[q.image.size];
      out.push({
        kind: 'image',
        dataUrl: imageUrl,
        mimeType: q.image.mimeType,
        widthPx,
        heightPx: (widthPx * q.image.naturalH) / q.image.naturalW,
        align: 'left',
        indentPx: QUESTION_IMAGE_INDENT_PX,
        spaceBeforePt: 6,
        spaceAfterPt: gap,
      });
    }
  });

  if (lh.viva.enabled) {
    out.push(
      para({
        runs: [{ text: lh.viva.label, bold: true }],
        rightRuns: [{ text: formatMarks(doc.vivaMarks, lh.marksUnit) }],
        sizePt: b.questionSizePt,
        spaceAfterPt: 6,
      }),
    );
  }
  return out;
}

function buildLetterBody(lh: Letterhead, doc: PaperDoc, mode: Mode): Block[] {
  const b = lh.body;
  const blocks = richHtmlToBlocks(letterBodyToHtml(doc.letterBody), { fontFamily: b.fontFamily, sizePt: b.textSizePt, color: b.color });
  if (blocks.length === 0 && mode === 'preview') {
    return [{
      kind: 'para', runs: [{ text: 'Your letter text appears here', placeholder: true }],
      fontFamily: b.fontFamily, sizePt: b.textSizePt, color: b.color, align: 'left', spaceBeforePt: 0, spaceAfterPt: 6,
    }];
  }
  return blocks;
}

export function buildDocument(lh: Letterhead, doc: PaperDoc, mode: Mode, assets: AssetUrls = NO_ASSETS): BuiltDocument {
  const page = pageGeometry(lh);
  const group = buildLetterheadGroup(lh, doc, mode, page, assets);
  const body: Block[] = [];
  const spacer = (pt: number): ParaBlock => ({
    kind: 'para', runs: [], fontFamily: lh.body.fontFamily, sizePt: 4, color: lh.body.color, align: 'left', spaceBeforePt: 0, spaceAfterPt: pt,
  });

  if (group && lh.placement === 'body') {
    body.push(group, spacer(6));
  }
  const details = buildDetails(lh, doc, mode);
  if (details) body.push(details);
  body.push(...(lh.kind === 'paper' ? buildPaperBody(lh, doc, mode, page, assets) : buildLetterBody(lh, doc, mode)));

  return { page, header: lh.placement === 'header' ? group : null, body };
}

/** Everything the user still has to fill in before the document is complete. */
export function findMissing(lh: Letterhead, doc: PaperDoc, tokens: string[]): string[] {
  const missing: string[] = [];
  for (const t of tokens) if (!(doc.fields[t] ?? '').trim()) missing.push(t);
  for (const f of lh.detailFields) {
    const v = (doc.details[f.id] ?? '').trim();
    if (f.kind === 'timeRange') {
      const [a, b] = v.split('|');
      if (!a || !b) missing.push(f.label);
    } else if (!v) {
      missing.push(f.label);
    }
  }
  if (lh.kind === 'paper') {
    if (lh.maxMarks.enabled && !doc.maxMarks.trim()) missing.push(lh.maxMarks.label);
    if (lh.viva.enabled && !doc.vivaMarks.trim()) missing.push(`${lh.viva.label} marks`);
    const qs = doc.questions.filter(questionHasContent);
    if (qs.length === 0) missing.push('at least one question');
    if (qs.some((q) => !q.marks.trim())) missing.push('marks for every question');
  } else if (!richHasContent(letterBodyToHtml(doc.letterBody))) {
    missing.push('letter text');
  }
  return missing;
}
