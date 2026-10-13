// The neutral layout model. Everything that is drawn (on-screen preview, the
// print/PDF page and the .docx file) is rendered from these blocks.

import type { Align, LineStyle, ParaAlign } from './types';

export interface Run {
  text: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strike?: boolean;
  color?: string;
  /** a line break inside the paragraph */
  br?: boolean;
  /** preview only: an unfilled {Token} or empty field, shown highlighted */
  placeholder?: boolean;
}

export interface ListInfo {
  kind: 'bullet' | 'number';
  /** 0-based nesting depth */
  level: number;
  /** items of one list share an id (so numbering restarts per list) */
  listId: string;
  /** 1-based position, used for numbered lists */
  number: number;
}

export interface ParaBlock {
  kind: 'para';
  runs: Run[];
  fontFamily: string;
  sizePt: number;
  color: string;
  align: ParaAlign;
  spaceBeforePt: number;
  spaceAfterPt: number;
  list?: ListInfo;
  /** left indent in px for paragraphs that continue a list item */
  indentPx?: number;
  /** pushed to the right edge with a tab stop (question marks) */
  rightRuns?: Run[];
}

export interface ImageBlock {
  kind: 'image';
  dataUrl: string;
  mimeType: string;
  widthPx: number;
  heightPx: number;
  align: Align;
  indentPx: number;
  spaceBeforePt: number;
  spaceAfterPt: number;
}

export interface RuleBlock {
  kind: 'rule';
  thicknessPt: number;
  lineStyle: LineStyle;
  color: string;
  spaceBeforePt: number;
  spaceAfterPt: number;
}

export interface DetailsBlock {
  kind: 'details';
  /** rows of two cells; each cell is a list of runs */
  rows: [Run[], Run[]][];
  fontFamily: string;
  sizePt: number;
  color: string;
  spaceAfterPt: number;
}

/** A logo beside the heading text that follows it. */
export interface RowBlock {
  kind: 'row';
  side: 'left' | 'right';
  logo: ImageBlock;
  blocks: Block[];
  gapPx: number;
}

export interface TableCellData {
  blocks: Block[];
  colSpan: number;
  rowSpan: number;
}

export interface TableBlock {
  kind: 'table';
  cols: number;
  rows: TableCellData[][];
  spaceAfterPt: number;
}

export interface GroupBlock {
  kind: 'group';
  blocks: Block[];
  band: string | null;
  frame: { color: string; widthPt: number } | null;
}

export type Block = ParaBlock | ImageBlock | RuleBlock | DetailsBlock | RowBlock | TableBlock | GroupBlock;

export interface PageGeometry {
  widthPx: number;
  heightPx: number;
  marginPx: number;
  contentWidthPx: number;
}

export interface BuiltDocument {
  page: PageGeometry;
  /** letterhead elements, when placed in a real Word page header */
  header: GroupBlock | null;
  body: Block[];
}
