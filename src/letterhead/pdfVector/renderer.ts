import PDFDocument from 'pdfkit';
import type { Block, DetailsBlock, GroupBlock, ImageBlock, ParaBlock, RowBlock, Run, RuleBlock, TableBlock } from '../blocks';
import { familyOf, fontKey, type Family } from './fonts';
import { splitScripts } from './script';

type Doc = InstanceType<typeof PDFDocument>;

// Layout blocks are measured in CSS pixels (96 dpi); a PDF works in points (72 dpi).
export const pt = (px: number) => px * 0.75;

const LIST_INDENT = pt(48); // per nesting level
const LIST_HANG = pt(24); // marker sits this far left of the text
const HEADER_GAP = pt(8);
const GROUP_PAD_X = pt(10);
const GROUP_PAD_Y = pt(8);
const CELL_PAD = pt(4);
const GRID_COLOUR = '#999999';

export interface PageSpec {
  width: number;
  height: number;
  margin: number;
}

interface Shared {
  fonts: Map<string, ArrayBuffer>;
  page: PageSpec;
  /** a hidden document used to measure content (table rows, header, groups) */
  scratch: PdfRenderer | null;
  scratchUses: number;
}

interface Seg {
  text: string;
  key: string;
  color: string;
  underline?: boolean;
  strike?: boolean;
}

function newDoc(shared: Shared, size: [number, number], margins: { top: number; bottom: number; left: number; right: number }, info?: Record<string, string>): Doc {
  const doc = new PDFDocument({
    autoFirstPage: false,
    compress: true,
    // no default font: every text call picks one of the embedded fonts, so no built-in font data is needed
    font: null as unknown as string,
    size,
    margins,
    info,
  });
  shared.fonts.forEach((buf, key) => doc.registerFont(key, buf));
  return doc;
}

/** Draws layout blocks into a PDFKit document as real (vector) text, lines and images. */
export class PdfRenderer {
  paginate: boolean;
  private header: GroupBlock | null = null;

  constructor(readonly doc: Doc, private shared: Shared, paginate: boolean) {
    this.paginate = paginate;
  }

  /** The main renderer: pages, margins and (optional) header repeated on every page. */
  static create(fonts: Map<string, ArrayBuffer>, page: PageSpec, header: GroupBlock | null, info: Record<string, string>): PdfRenderer {
    const shared: Shared = { fonts, page, scratch: null, scratchUses: 0 };
    const m = page.margin;
    const doc = newDoc(shared, [page.width, page.height], { top: m, bottom: m, left: m, right: m }, info);
    const r = new PdfRenderer(doc, shared, true);
    r.header = header;
    doc.on('pageAdded', () => r.onPageAdded());
    doc.addPage();
    return r;
  }

  get contentWidth(): number {
    return this.shared.page.width - this.shared.page.margin * 2;
  }

  get margin(): number {
    return this.shared.page.margin;
  }

  // ── page handling ──────────────────────────────────────────────────────────

  private onPageAdded(): void {
    if (!this.header) return;
    const was = this.paginate;
    this.paginate = false;
    const doc = this.doc;
    doc.x = this.margin;
    doc.y = this.margin;
    this.group(this.header, this.margin, this.contentWidth);
    // text that flows onto later pages starts below the header
    doc.page.margins.top = doc.y + HEADER_GAP;
    doc.y = doc.page.margins.top;
    doc.x = this.margin;
    this.paginate = was;
  }

  private ensureSpace(height: number): void {
    if (this.paginate && this.doc.y + height > this.doc.page.maxY() + 0.01) this.doc.addPage();
  }

  // ── measuring ──────────────────────────────────────────────────────────────

  private scratchRenderer(): PdfRenderer {
    const s = this.shared;
    if (!s.scratch || s.scratchUses > 150) {
      // a fresh hidden page from time to time keeps its memory small
      const doc = newDoc(s, [2000, 40000], { top: 0, bottom: 0, left: 0, right: 0 });
      doc.addPage();
      s.scratch = new PdfRenderer(doc, s, false);
      s.scratchUses = 0;
    }
    s.scratchUses++;
    return s.scratch;
  }

  /** Height the blocks need at the given width. */
  measure(blocks: Block[], width: number): number {
    const m = this.scratchRenderer();
    // measuring can nest (a row inside a group), and the same hidden page is reused,
    // so remember where the outer measurement was and put it back afterwards
    const { x, y } = m.doc;
    m.doc.x = 0;
    m.doc.y = 0;
    m.blocks(blocks, 0, width);
    const height = m.doc.y;
    m.doc.x = x;
    m.doc.y = y;
    return height;
  }

  // ── blocks ─────────────────────────────────────────────────────────────────

  blocks(blocks: Block[], x: number, width: number): void {
    for (const b of blocks) {
      switch (b.kind) {
        case 'para': this.para(b, x, width); break;
        case 'image': this.image(b, x, width); break;
        case 'rule': this.rule(b, x, width); break;
        case 'details': this.details(b, x, width); break;
        case 'row': this.row(b, x, width); break;
        case 'table': this.table(b, x, width); break;
        case 'group': this.group(b, x, width); break;
      }
    }
  }

  private lineHeight(family: Family, size: number): number {
    return this.doc.font(fontKey(family, 'latin', false, false)).fontSize(size).currentLineHeight(true);
  }

  private segments(runs: Run[], family: Family, defaultColor: string): Seg[] {
    const out: Seg[] = [];
    for (const r of runs) {
      if (r.br) { out.push({ text: '\n', key: fontKey(family, 'latin', false, false), color: defaultColor }); continue; }
      for (const s of splitScripts(r.text)) {
        out.push({
          text: s.text,
          key: fontKey(family, s.script, !!r.bold, !!r.italic),
          color: r.color ?? defaultColor,
          underline: r.underline,
          strike: r.strike,
        });
      }
    }
    return out;
  }

  /** Writes runs starting at (x, doc.y); lines wrap inside `width`. */
  private runs(runs: Run[], p: Pick<ParaBlock, 'sizePt' | 'color' | 'align'>, family: Family, x: number, width: number): void {
    const segs = this.segments(runs, family, p.color).filter((s) => s.text !== '');
    if (segs.length === 0) return;
    const doc = this.doc;
    doc.fontSize(p.sizePt);
    doc.x = x;
    segs.forEach((s, i) => {
      doc.font(s.key).fillColor(s.color).text(s.text, {
        width,
        align: p.align,
        continued: i < segs.length - 1,
        underline: s.underline,
        strike: s.strike,
      });
    });
    doc.x = x;
  }

  private marker(p: ParaBlock, textX: number, y0: number, lineH: number, family: Family): void {
    const l = p.list;
    if (!l) return;
    const doc = this.doc;
    doc.fillColor(p.color).strokeColor(p.color);
    if (l.kind === 'bullet') {
      const r = Math.max(1.4, p.sizePt * 0.1);
      const cx = textX - LIST_HANG + r + 1;
      const cy = y0 + lineH * 0.55;
      if (l.level % 3 === 0) doc.circle(cx, cy, r).fill();
      else if (l.level % 3 === 1) doc.lineWidth(0.6).circle(cx, cy, r).stroke();
      else doc.rect(cx - r, cy - r, r * 2, r * 2).fill();
    } else {
      doc.font(fontKey(family, 'latin', false, false)).fontSize(p.sizePt);
      doc.text(`${l.number}.`, textX - pt(40), y0, { width: pt(40) - pt(5), align: 'right', lineBreak: false });
    }
  }

  private para(p: ParaBlock, x: number, width: number): void {
    const doc = this.doc;
    const family = familyOf(p.fontFamily);
    const left = p.list ? LIST_INDENT * (p.list.level + 1) : p.indentPx ? pt(p.indentPx) : 0;
    const lineH = this.lineHeight(family, p.sizePt);

    doc.y += p.spaceBeforePt;
    this.ensureSpace(lineH);
    const y0 = doc.y;
    if (p.list) this.marker(p, x + left, y0, lineH, family);
    doc.x = x + left;
    doc.y = y0;

    if (p.rightRuns && p.rightRuns.length > 0) {
      // the marks sit at the right edge, level with the last line of the question
      const rightText = p.rightRuns.map((r) => r.text).join('');
      const rightFont = fontKey(family, 'latin', false, false);
      doc.font(rightFont).fontSize(p.sizePt);
      const rw = doc.widthOfString(rightText);
      this.runs(p.runs, p, family, x + left, width - left - rw - pt(12));
      const endY = Math.max(doc.y, y0 + lineH);
      doc.font(rightFont).fontSize(p.sizePt).fillColor(p.color).text(rightText, x + width - rw, endY - lineH, { lineBreak: false });
      doc.x = x;
      doc.y = endY;
    } else if (p.runs.length === 0 || p.runs.every((r) => !r.br && r.text === '')) {
      doc.y = y0 + lineH; // a blank line
    } else {
      this.runs(p.runs, p, family, x + left, width - left);
    }
    doc.x = x;
    doc.y += p.spaceAfterPt;
  }

  private image(b: ImageBlock, x: number, width: number): void {
    const doc = this.doc;
    const w = pt(b.widthPx);
    const h = pt(b.heightPx);
    const indent = pt(b.indentPx);
    const ax = b.align === 'center' ? x + (width - w) / 2 : b.align === 'right' ? x + width - w : x + indent;
    doc.y += b.spaceBeforePt;
    this.ensureSpace(h);
    doc.image(b.dataUrl, ax, doc.y, { width: w, height: h });
    doc.x = x;
    doc.y += h + b.spaceAfterPt;
  }

  private rule(b: RuleBlock, x: number, width: number): void {
    const doc = this.doc;
    const w = Math.max(b.thicknessPt, 0.5);
    doc.y += b.spaceBeforePt;
    this.ensureSpace(w * 3);
    const y = doc.y + w / 2;
    doc.strokeColor(b.color).lineWidth(w);
    if (b.lineStyle === 'dashed') doc.dash(w * 3, { space: w * 2 });
    else if (b.lineStyle === 'dotted') doc.dash(w, { space: w * 2 });
    if (b.lineStyle === 'double') {
      const t = w / 3;
      doc.lineWidth(t).moveTo(x, y - t).lineTo(x + width, y - t).stroke();
      doc.moveTo(x, y + t).lineTo(x + width, y + t).stroke();
    } else {
      doc.moveTo(x, y).lineTo(x + width, y).stroke();
    }
    doc.undash();
    doc.x = x;
    doc.y += w + b.spaceAfterPt;
  }

  /** Header block: optional background / border around a stack of blocks. */
  private group(g: GroupBlock, x: number, width: number): void {
    const doc = this.doc;
    if (!g.band && !g.frame) {
      this.blocks(g.blocks, x, width);
      return;
    }
    const innerW = width - GROUP_PAD_X * 2;
    const innerH = this.measure(g.blocks, innerW);
    const total = innerH + GROUP_PAD_Y * 2;
    this.ensureSpace(total);
    const y = doc.y;
    if (g.band) doc.rect(x, y, width, total).fill(g.band);
    if (g.frame) doc.lineWidth(Math.max(g.frame.widthPt, 0.5)).strokeColor(g.frame.color).rect(x, y, width, total).stroke();
    doc.x = x + GROUP_PAD_X;
    doc.y = y + GROUP_PAD_Y;
    const was = this.paginate;
    this.paginate = false;
    this.blocks(g.blocks, x + GROUP_PAD_X, innerW);
    this.paginate = was;
    doc.x = x;
    doc.y = y + total;
  }

  /** A logo beside the heading text, vertically centred. */
  private row(b: RowBlock, x: number, width: number): void {
    const doc = this.doc;
    const logoW = pt(b.logo.widthPx);
    const logoH = pt(b.logo.heightPx);
    const gap = pt(b.gapPx);
    const textW = width - logoW - gap;
    const textH = this.measure(b.blocks, textW);
    const H = Math.max(logoH, textH);
    doc.y += b.logo.spaceBeforePt;
    this.ensureSpace(H);
    const y = doc.y;
    const logoX = b.side === 'left' ? x : x + width - logoW;
    const textX = b.side === 'left' ? x + logoW + gap : x;
    doc.image(b.logo.dataUrl, logoX, y + (H - logoH) / 2, { width: logoW, height: logoH });
    doc.x = textX;
    doc.y = y + (H - textH) / 2;
    const was = this.paginate;
    this.paginate = false;
    this.blocks(b.blocks, textX, textW);
    this.paginate = was;
    doc.x = x;
    doc.y = y + H + b.logo.spaceAfterPt;
  }

  private details(b: DetailsBlock, x: number, width: number): void {
    const cell = (runs: Run[]): Block[] => [
      { kind: 'para', runs, fontFamily: b.fontFamily, sizePt: b.sizePt, color: b.color, align: 'left', spaceBeforePt: 0, spaceAfterPt: b.spaceAfterPt },
    ];
    const rows = b.rows.map((r) => r.map((runs) => ({ blocks: cell(runs), colSpan: 1, rowSpan: 1 })));
    this.grid(rows, 2, x, width, { border: false, pad: 0, after: 0 });
  }

  private table(t: TableBlock, x: number, width: number): void {
    this.grid(t.rows, t.cols, x, width, { border: true, pad: CELL_PAD, after: t.spaceAfterPt });
  }

  /** Rows of cells in equal columns, with optional borders; a row never splits across pages. */
  private grid(
    rows: { blocks: Block[]; colSpan: number; rowSpan: number }[][],
    cols: number,
    x: number,
    width: number,
    opt: { border: boolean; pad: number; after: number },
  ): void {
    const doc = this.doc;
    const colW = width / cols;

    // place cells, skipping columns taken by a cell above that spans several rows
    const taken: boolean[][] = rows.map(() => Array<boolean>(cols).fill(false));
    const placed: { r: number; c: number; span: number; rowSpan: number; blocks: Block[] }[] = [];
    rows.forEach((row, r) => {
      let c = 0;
      for (const cell of row) {
        while (c < cols && taken[r][c]) c++;
        if (c >= cols) break;
        const span = Math.min(cell.colSpan, cols - c);
        const rs = Math.min(cell.rowSpan, rows.length - r);
        for (let rr = r; rr < r + rs; rr++) for (let cc = c; cc < c + span; cc++) taken[rr][cc] = true;
        placed.push({ r, c, span, rowSpan: rs, blocks: cell.blocks });
        c += span;
      }
    });

    const need = (p: (typeof placed)[number]) => this.measure(p.blocks, colW * p.span - opt.pad * 2) + opt.pad * 2;
    const rowH = rows.map(() => 0);
    placed.filter((p) => p.rowSpan === 1).forEach((p) => { rowH[p.r] = Math.max(rowH[p.r], need(p)); });
    placed.filter((p) => p.rowSpan > 1).forEach((p) => {
      const have = rowH.slice(p.r, p.r + p.rowSpan).reduce((a, b) => a + b, 0);
      const n = need(p);
      if (n > have) rowH[p.r + p.rowSpan - 1] += n - have;
    });

    let y = doc.y;
    rows.forEach((_, r) => {
      if (this.paginate && y + rowH[r] > doc.page.maxY() + 0.01 && y > doc.page.margins.top + 1) {
        doc.addPage();
        y = doc.y;
      }
      for (const p of placed.filter((q) => q.r === r)) {
        const h = rowH.slice(p.r, p.r + p.rowSpan).reduce((a, b) => a + b, 0);
        const cx = x + p.c * colW;
        if (opt.border) doc.lineWidth(0.75).strokeColor(GRID_COLOUR).rect(cx, y, colW * p.span, h).stroke();
        // draw the content without letting PDFKit start a new page in the middle of a cell
        const bottom = doc.page.margins.bottom;
        doc.page.margins.bottom = 0;
        const was = this.paginate;
        this.paginate = false;
        doc.x = cx + opt.pad;
        doc.y = y + opt.pad;
        this.blocks(p.blocks, cx + opt.pad, colW * p.span - opt.pad * 2);
        this.paginate = was;
        doc.page.margins.bottom = bottom;
      }
      y += rowH[r];
    });
    doc.x = x;
    doc.y = y + opt.after;
  }
}
