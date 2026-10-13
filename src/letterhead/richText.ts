// Rich-text HTML (from the letter editor, or pasted from Word / web pages) ->
// layout blocks. Only structure we can reproduce faithfully in Word is kept:
// paragraphs, headings, bold/italic/underline/strike, text colour, alignment,
// bullet/numbered lists (nested) and tables. Everything else is dropped.

import { cssColorToHex } from './color';
import type { Block, ParaBlock, Run, TableCellData } from './blocks';
import type { ParaAlign } from './types';
import { escapeHtml, parseHtml } from '../utils/html';

interface Base {
  fontFamily: string;
  sizePt: number;
  color: string;
}

interface Fmt {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strike?: boolean;
  color?: string;
}

interface Ctx extends Base {
  fmt: Fmt;
  /** counter so every list gets its own id */
  seq: { n: number };
}

const BLOCK_TAGS = new Set(['p', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'table', 'blockquote', 'pre', 'hr', 'li']);
const HEADING_SCALE: Record<string, number> = { h1: 1.6, h2: 1.35, h3: 1.17, h4: 1, h5: 1, h6: 1 };

const tagOf = (n: Node): string => (n.nodeType === 1 ? (n as HTMLElement).tagName.toLowerCase() : '');

/** Older documents stored the letter as plain text (one paragraph per line); new ones store HTML. */
export function letterBodyToHtml(body: string): string {
  if (!body) return '';
  if (/^\s*</.test(body)) return body;
  return body
    .split(/\r?\n/)
    .map((line) => `<p>${escapeHtml(line)}</p>`)
    .join('');
}

/** True when the HTML has visible text or a table / rule (an empty editor is "<p></p>"). */
export function richHasContent(html: string): boolean {
  if (!html || !html.trim()) return false;
  const body = parseHtml(html);
  return (body.textContent ?? '').trim().length > 0 || body.querySelector('table, hr') !== null;
}

function inlineRuns(node: Node, fmt: Fmt, out: Run[]): void {
  if (node.nodeType === 3) {
    const t = (node.textContent ?? '').replace(/[ \t\r\n]+/g, ' ');
    if (t) out.push({ text: t, ...fmt });
    return;
  }
  if (node.nodeType !== 1) return;
  const el = node as HTMLElement;
  const tag = tagOf(el);
  if (tag === 'br') { out.push({ text: '', br: true }); return; }
  if (tag === 'img' || tag === 'script' || tag === 'style') return;

  const next: Fmt = { ...fmt };
  if (tag === 'strong' || tag === 'b') next.bold = true;
  if (tag === 'em' || tag === 'i') next.italic = true;
  if (tag === 'u') next.underline = true;
  if (tag === 's' || tag === 'strike' || tag === 'del') next.strike = true;
  const st = el.style;
  if (st) {
    const fw = st.fontWeight;
    if (fw === 'bold' || Number(fw) >= 600) next.bold = true;
    if (st.fontStyle === 'italic') next.italic = true;
    const deco = `${st.textDecorationLine ?? ''} ${st.textDecoration ?? ''}`;
    if (deco.includes('underline')) next.underline = true;
    if (deco.includes('line-through')) next.strike = true;
  }
  const c = cssColorToHex(st?.color || el.getAttribute('color'));
  if (c) next.color = c;
  el.childNodes.forEach((ch) => inlineRuns(ch, next, out));
}

/** Drops empty runs and trims the paragraph's outer whitespace. */
function tidyRuns(runs: Run[]): Run[] {
  const out = runs.filter((r) => r.br || r.text !== '');
  while (out.length && !out[0].br && out[0].text.trim() === '') out.shift();
  while (out.length && !out[out.length - 1].br && out[out.length - 1].text.trim() === '') out.pop();
  if (out.length && !out[0].br) out[0] = { ...out[0], text: out[0].text.replace(/^\s+/, '') };
  const last = out.length - 1;
  if (last >= 0 && !out[last].br) out[last] = { ...out[last], text: out[last].text.replace(/\s+$/, '') };
  return out;
}

function alignOf(el: HTMLElement): ParaAlign {
  const a = (el.style?.textAlign || el.getAttribute('align') || '').toLowerCase();
  return a === 'center' || a === 'right' || a === 'justify' ? a : 'left';
}

function para(runs: Run[], ctx: Ctx, over: Partial<ParaBlock> = {}): ParaBlock {
  return {
    kind: 'para',
    runs,
    fontFamily: ctx.fontFamily,
    sizePt: ctx.sizePt,
    color: ctx.color,
    align: 'left',
    spaceBeforePt: 0,
    spaceAfterPt: 6,
    ...over,
  };
}

function runsOfChildren(el: HTMLElement, ctx: Ctx): Run[] {
  const runs: Run[] = [];
  el.childNodes.forEach((ch) => inlineRuns(ch, ctx.fmt, runs));
  return tidyRuns(runs);
}

function hasBlockChild(el: HTMLElement): boolean {
  return Array.from(el.childNodes).some((n) => BLOCK_TAGS.has(tagOf(n)));
}

function listBlocks(el: HTMLElement, ctx: Ctx, level: number): Block[] {
  const ordered = tagOf(el) === 'ol';
  const listId = `l${ctx.seq.n++}`;
  const start = ordered ? Number(el.getAttribute('start')) || 1 : 1;
  const out: Block[] = [];
  let n = start;
  for (const li of Array.from(el.children)) {
    if (tagOf(li) !== 'li') continue;
    const inner = blocksFromNodes(li.childNodes, ctx, level + 1);
    const first = inner.find((b): b is ParaBlock => b.kind === 'para' && !b.list);
    const info = { kind: ordered ? ('number' as const) : ('bullet' as const), level, listId, number: n++ };
    if (first) {
      first.list = info;
      first.spaceAfterPt = 2;
      // other plain paragraphs of the item line up under the text
      for (const b of inner) if (b !== first && b.kind === 'para' && !b.list) b.indentPx = 48 * (level + 1);
      out.push(...inner);
    } else {
      out.push(para([], ctx, { list: info, spaceAfterPt: 2 }), ...inner);
    }
  }
  return out;
}

function tableBlock(el: HTMLElement, ctx: Ctx): Block | null {
  const rows: TableCellData[][] = [];
  for (const tr of Array.from(el.querySelectorAll('tr'))) {
    // only this table's rows (not rows of a nested table)
    if (tr.closest('table') !== el) continue;
    const cells: TableCellData[] = [];
    for (const cell of Array.from(tr.children)) {
      const tag = tagOf(cell);
      if (tag !== 'td' && tag !== 'th') continue;
      const cellCtx: Ctx = tag === 'th' ? { ...ctx, fmt: { ...ctx.fmt, bold: true } } : ctx;
      let blocks = blocksFromNodes(cell.childNodes, cellCtx, 0);
      if (blocks.length === 0) blocks = [para([], cellCtx, { spaceAfterPt: 0 })];
      else blocks.forEach((b) => { if (b.kind === 'para' && !b.list) b.spaceAfterPt = Math.min(b.spaceAfterPt, 2); });
      const c = cell as HTMLTableCellElement;
      cells.push({ blocks, colSpan: Math.max(1, c.colSpan || 1), rowSpan: Math.max(1, c.rowSpan || 1) });
    }
    if (cells.length) rows.push(cells);
  }
  if (rows.length === 0) return null;
  const cols = Math.max(...rows.map((r) => r.reduce((s, c) => s + c.colSpan, 0)));
  return { kind: 'table', cols, rows, spaceAfterPt: 8 };
}

function blockFromElement(el: HTMLElement, ctx: Ctx, level: number): Block[] {
  const tag = tagOf(el);
  if (tag === 'ul' || tag === 'ol') return listBlocks(el, ctx, level);
  if (tag === 'table') {
    const t = tableBlock(el, ctx);
    return t ? [t] : [];
  }
  if (tag === 'hr') {
    return [{ kind: 'rule', thicknessPt: 0.75, lineStyle: 'single', color: '#999999', spaceBeforePt: 4, spaceAfterPt: 8 }];
  }
  if ((tag === 'div' || tag === 'blockquote' || tag === 'li') && hasBlockChild(el)) {
    return blocksFromNodes(el.childNodes, ctx, level);
  }
  if (tag in HEADING_SCALE) {
    const hctx: Ctx = { ...ctx, fmt: { ...ctx.fmt, bold: true } };
    return [para(runsOfChildren(el, hctx), hctx, {
      sizePt: Math.round(ctx.sizePt * HEADING_SCALE[tag] * 2) / 2,
      align: alignOf(el),
      spaceBeforePt: 8,
      spaceAfterPt: 4,
    })];
  }
  if (tag === 'pre') {
    return [para([{ text: el.textContent ?? '', ...ctx.fmt }], ctx, { fontFamily: 'Courier New' })];
  }
  // p, div, blockquote, stray li: one paragraph (an empty one is a blank line)
  return [para(runsOfChildren(el, ctx), ctx, { align: alignOf(el) })];
}

function blocksFromNodes(nodes: ArrayLike<Node>, ctx: Ctx, level: number): Block[] {
  const out: Block[] = [];
  let buf: Node[] = [];
  const flush = () => {
    if (buf.length === 0) return;
    const runs: Run[] = [];
    buf.forEach((n) => inlineRuns(n, ctx.fmt, runs));
    buf = [];
    const clean = tidyRuns(runs);
    if (clean.length) out.push(para(clean, ctx));
  };
  for (const n of Array.from(nodes)) {
    if (n.nodeType === 1 && BLOCK_TAGS.has(tagOf(n))) {
      flush();
      out.push(...blockFromElement(n as HTMLElement, ctx, level));
    } else {
      buf.push(n);
    }
  }
  flush();
  return out;
}

/** Rich-text HTML -> layout blocks, using `base` as the default font / size / colour. */
export function richHtmlToBlocks(html: string, base: Base): Block[] {
  if (!richHasContent(html)) return [];
  const ctx: Ctx = { ...base, fmt: {}, seq: { n: 0 } };
  return blocksFromNodes(parseHtml(html).childNodes, ctx, 0);
}
