import {
  AlignmentType,
  BorderStyle,
  Document,
  Header,
  ImageRun,
  LevelFormat,
  Packer,
  Paragraph,
  ShadingType,
  Tab,
  TabStopType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  VerticalAlign,
  WidthType,
} from 'docx';
import type { AssetUrls } from './assets';
import { docxColor } from './color';
import {
  buildDocument,
  mmToTwips,
  PAGE_TWIPS,
  type Block,
  type DetailsBlock,
  type GroupBlock,
  type ImageBlock,
  type ParaBlock,
  type RowBlock,
  type RuleBlock,
  type Run,
  type TableBlock,
} from './layout';
import type { Letterhead, LineStyle, PaperDoc, ParaAlign } from './types';

const PX_TO_TWIPS = 15;
const pt = (n: number) => Math.round(n * 20);

type DocxChild = Paragraph | Table;

const ALIGN: Record<ParaAlign, (typeof AlignmentType)[keyof typeof AlignmentType]> = {
  left: AlignmentType.LEFT,
  center: AlignmentType.CENTER,
  right: AlignmentType.RIGHT,
  justify: AlignmentType.JUSTIFIED,
};

const LINE: Record<LineStyle, (typeof BorderStyle)[keyof typeof BorderStyle]> = {
  single: BorderStyle.SINGLE,
  double: BorderStyle.DOUBLE,
  dashed: BorderStyle.DASHED,
  dotted: BorderStyle.DOTTED,
};

function base64ToBytes(dataUrl: string): Uint8Array {
  const b64 = dataUrl.slice(dataUrl.indexOf(',') + 1);
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function imageType(mime: string): 'png' | 'jpg' | 'gif' | 'bmp' {
  const m = mime.toLowerCase();
  if (m === 'image/jpeg' || m === 'image/jpg') return 'jpg';
  if (m === 'image/gif') return 'gif';
  if (m === 'image/bmp') return 'bmp';
  return 'png';
}

const numberingRef = (listId: string) => `num-${listId}`;

function textRun(r: Run, font: string, sizePt: number, color: string): TextRun {
  if (r.br) return new TextRun({ break: 1 });
  return new TextRun({
    text: r.text,
    font,
    size: Math.round(sizePt * 2),
    bold: r.bold || undefined,
    italics: r.italic || undefined,
    underline: r.underline ? {} : undefined,
    strike: r.strike || undefined,
    color: docxColor(r.color ?? color),
  });
}

function paraNode(b: ParaBlock, contentTwips: number): Paragraph {
  const children: TextRun[] = b.runs.map((r) => textRun(r, b.fontFamily, b.sizePt, b.color));
  if (b.rightRuns && b.rightRuns.length) {
    children.push(
      new TextRun({ children: [new Tab()], font: b.fontFamily, size: Math.round(b.sizePt * 2) }),
      ...b.rightRuns.map((r) => textRun(r, b.fontFamily, b.sizePt, b.color)),
    );
  }
  const list = b.list;
  return new Paragraph({
    children,
    alignment: ALIGN[b.align],
    spacing: { before: pt(b.spaceBeforePt), after: pt(b.spaceAfterPt), line: 240 },
    bullet: list?.kind === 'bullet' ? { level: Math.min(8, list.level) } : undefined,
    numbering: list?.kind === 'number' ? { reference: numberingRef(list.listId), level: Math.min(8, list.level) } : undefined,
    indent: b.indentPx ? { left: Math.round(b.indentPx * PX_TO_TWIPS) } : undefined,
    tabStops: b.rightRuns ? [{ type: TabStopType.RIGHT, position: contentTwips }] : undefined,
    run: { font: b.fontFamily, size: Math.round(b.sizePt * 2) },
  });
}

function imageNode(b: ImageBlock): Paragraph {
  return new Paragraph({
    children: [
      new ImageRun({
        type: imageType(b.mimeType),
        data: base64ToBytes(b.dataUrl),
        transformation: { width: Math.max(1, Math.round(b.widthPx)), height: Math.max(1, Math.round(b.heightPx)) },
      }),
    ],
    alignment: ALIGN[b.align],
    indent: b.indentPx ? { left: Math.round(b.indentPx * PX_TO_TWIPS) } : undefined,
    spacing: { before: pt(b.spaceBeforePt), after: pt(b.spaceAfterPt), line: 240 },
  });
}

function ruleNode(b: RuleBlock): Paragraph {
  return new Paragraph({
    children: [],
    border: {
      bottom: {
        style: LINE[b.lineStyle],
        size: Math.min(96, Math.max(2, Math.round(b.thicknessPt * 8))),
        color: docxColor(b.color),
        space: 1,
      },
    },
    spacing: { before: pt(b.spaceBeforePt), after: pt(b.spaceAfterPt), line: 20 },
    run: { size: 2 },
  });
}

const NO_BORDER = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' } as const;
const NO_BORDERS = { top: NO_BORDER, bottom: NO_BORDER, left: NO_BORDER, right: NO_BORDER } as const;
const GRID_BORDER = { style: BorderStyle.SINGLE, size: 4, color: '999999' } as const;
const GRID_BORDERS = { top: GRID_BORDER, bottom: GRID_BORDER, left: GRID_BORDER, right: GRID_BORDER } as const;

/** a Word table cell (or section) must end with a paragraph, not a table */
function endWithParagraph(nodes: DocxChild[]): DocxChild[] {
  const last = nodes[nodes.length - 1];
  if (nodes.length === 0 || last instanceof Table) return [...nodes, new Paragraph({ children: [], spacing: { after: 0, line: 20 }, run: { size: 2 } })];
  return nodes;
}

function detailsNode(b: DetailsBlock, contentTwips: number): Table {
  const half = Math.floor(contentTwips / 2);
  const cell = (runs: Run[]) =>
    new TableCell({
      width: { size: half, type: WidthType.DXA },
      borders: NO_BORDERS,
      children: [
        new Paragraph({
          children: runs.map((r) => textRun(r, b.fontFamily, b.sizePt, b.color)),
          spacing: { after: pt(b.spaceAfterPt), line: 240 },
          run: { font: b.fontFamily, size: Math.round(b.sizePt * 2) },
        }),
      ],
    });
  return new Table({
    width: { size: contentTwips, type: WidthType.DXA },
    columnWidths: [half, half],
    borders: { ...NO_BORDERS, insideHorizontal: NO_BORDER, insideVertical: NO_BORDER },
    rows: b.rows.map((r) => new TableRow({ children: [cell(r[0]), cell(r[1])] })),
  });
}

/** Logo beside the heading: a borderless two-column table with the content vertically centred. */
function rowNode(b: RowBlock, contentTwips: number): Table {
  const logoTwips = Math.min(Math.round((b.logo.widthPx + b.gapPx) * PX_TO_TWIPS), Math.round(contentTwips * 0.5));
  const textTwips = contentTwips - logoTwips;
  const gap = Math.round(b.gapPx * PX_TO_TWIPS);
  const logoLeft = b.side === 'left';

  const logoCell = new TableCell({
    width: { size: logoTwips, type: WidthType.DXA },
    borders: NO_BORDERS,
    verticalAlign: VerticalAlign.CENTER,
    margins: logoLeft ? { right: gap } : { left: gap },
    children: [imageNode({ ...b.logo, align: logoLeft ? 'left' : 'right', spaceBeforePt: 0, spaceAfterPt: 0 })],
  });
  const textCell = new TableCell({
    width: { size: textTwips, type: WidthType.DXA },
    borders: NO_BORDERS,
    verticalAlign: VerticalAlign.CENTER,
    children: endWithParagraph(b.blocks.flatMap((c) => blockNodes(c, textTwips))) as Paragraph[],
  });

  return new Table({
    width: { size: contentTwips, type: WidthType.DXA },
    columnWidths: logoLeft ? [logoTwips, textTwips] : [textTwips, logoTwips],
    borders: { ...NO_BORDERS, insideHorizontal: NO_BORDER, insideVertical: NO_BORDER },
    rows: [new TableRow({ children: logoLeft ? [logoCell, textCell] : [textCell, logoCell] })],
  });
}

/** A table from the rich-text editor. */
function tableNodes(b: TableBlock, contentTwips: number): DocxChild[] {
  const colW = Math.floor(contentTwips / b.cols);
  const table = new Table({
    width: { size: colW * b.cols, type: WidthType.DXA },
    columnWidths: Array.from({ length: b.cols }, () => colW),
    borders: { ...GRID_BORDERS, insideHorizontal: GRID_BORDER, insideVertical: GRID_BORDER },
    rows: b.rows.map(
      (row) =>
        new TableRow({
          children: row.map((c) => {
            const w = colW * c.colSpan;
            return new TableCell({
              width: { size: w, type: WidthType.DXA },
              columnSpan: c.colSpan > 1 ? c.colSpan : undefined,
              rowSpan: c.rowSpan > 1 ? c.rowSpan : undefined,
              borders: GRID_BORDERS,
              margins: { top: 60, bottom: 60, left: 100, right: 100 },
              children: endWithParagraph(c.blocks.flatMap((x) => blockNodes(x, w - 200))) as Paragraph[],
            });
          }),
        }),
    ),
  });
  return [table, new Paragraph({ children: [], spacing: { after: pt(b.spaceAfterPt), line: 20 }, run: { size: 2 } })];
}

function blockNodes(b: Block, contentTwips: number): DocxChild[] {
  switch (b.kind) {
    case 'para': return [paraNode(b, contentTwips)];
    case 'image': return [imageNode(b)];
    case 'rule': return [ruleNode(b)];
    case 'details': return [detailsNode(b, contentTwips)];
    case 'row': return [rowNode(b, contentTwips)];
    case 'table': return tableNodes(b, contentTwips);
    case 'group': return groupNodes(b, contentTwips);
  }
}

/** A header block with a background band and/or border becomes a one-cell table; otherwise plain paragraphs. */
function groupNodes(g: GroupBlock, contentTwips: number): DocxChild[] {
  const marginTwips = g.band || g.frame ? 120 : 0;
  const inner = g.blocks.flatMap((b) => blockNodes(b, contentTwips - marginTwips * 2));
  if (!g.band && !g.frame) return inner;

  const edge = g.frame
    ? { style: BorderStyle.SINGLE, size: Math.max(2, Math.round(g.frame.widthPt * 8)), color: docxColor(g.frame.color) }
    : NO_BORDER;
  return [
    new Table({
      width: { size: contentTwips, type: WidthType.DXA },
      columnWidths: [contentTwips],
      borders: { top: edge, bottom: edge, left: edge, right: edge, insideHorizontal: NO_BORDER, insideVertical: NO_BORDER },
      rows: [
        new TableRow({
          children: [
            new TableCell({
              width: { size: contentTwips, type: WidthType.DXA },
              borders: { top: edge, bottom: edge, left: edge, right: edge },
              shading: g.band ? { type: ShadingType.CLEAR, fill: docxColor(g.band), color: 'auto' } : undefined,
              margins: { top: 100, bottom: 100, left: marginTwips, right: marginTwips },
              children: endWithParagraph(inner) as Paragraph[],
            }),
          ],
        }),
      ],
    }),
  ];
}

function numberedListIds(blocks: Block[], into: Set<string>): void {
  for (const b of blocks) {
    if (b.kind === 'para' && b.list?.kind === 'number') into.add(b.list.listId);
    else if (b.kind === 'group' || b.kind === 'row') numberedListIds(b.blocks, into);
    else if (b.kind === 'table') b.rows.forEach((r) => r.forEach((c) => numberedListIds(c.blocks, into)));
  }
}

/** The `assets` map must already hold every image the letterhead and document use (see loadAssets). */
export async function generateLetterheadDocx(lh: Letterhead, doc: PaperDoc, assets: AssetUrls): Promise<Blob> {
  const built = buildDocument(lh, doc, 'export', assets);
  const size = PAGE_TWIPS[lh.page.size];
  const margin = mmToTwips(lh.page.marginMm);
  const contentTwips = size.w - margin * 2;

  const children: DocxChild[] = endWithParagraph(built.body.flatMap((b) => blockNodes(b, contentTwips)));

  const headers = built.header
    ? { default: new Header({ children: endWithParagraph(groupNodes(built.header, contentTwips)) as Paragraph[] }) }
    : undefined;

  const listIds = new Set<string>();
  numberedListIds(built.body, listIds);

  const document = new Document({
    creator: lh.name || 'PaperForge',
    title: doc.title || lh.name,
    styles: {
      default: { document: { run: { font: lh.body.fontFamily, size: Math.round(lh.body.textSizePt * 2) } } },
    },
    numbering: {
      config: [...listIds].map((id) => ({
        reference: numberingRef(id),
        levels: Array.from({ length: 9 }, (_, i) => ({
          level: i,
          format: LevelFormat.DECIMAL,
          text: `%${i + 1}.`,
          alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720 * (i + 1), hanging: 360 } } },
        })),
      })),
    },
    sections: [
      {
        properties: {
          page: {
            size: { width: size.w, height: size.h },
            margin: { top: margin, bottom: margin, left: margin, right: margin, header: 708, footer: 708 },
          },
        },
        headers,
        children,
      },
    ],
  });
  return Packer.toBlob(document);
}
