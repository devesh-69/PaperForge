// Data model for the Letterhead feature.
// A Letterhead is a reusable design (header elements + page + body settings).
// A PaperDoc is one document made from a letterhead (the values that get filled in).

export type Align = 'left' | 'center' | 'right';
export type ParaAlign = Align | 'justify';
export type LineStyle = 'single' | 'double' | 'dashed' | 'dotted';
export type Placement = 'body' | 'header';
export type DocKind = 'paper' | 'letter';
export type PageSize = 'A4' | 'Letter';
export type ImageSizeKey = 'S' | 'M' | 'L' | 'Full';
/** where the logo sits: on its own row above the text, or beside the heading text that follows it */
export type LogoPlacement = 'above' | 'left' | 'right';

export interface TextStyle {
  fontFamily: string;
  sizePt: number;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  /** #rrggbb */
  color: string;
  align: Align;
  spaceBeforePt: number;
  spaceAfterPt: number;
}

/** An image's bytes, kept apart from the records that use it so list pages stay light. */
export interface StoredAsset {
  id: string;
  dataUrl: string;
  mimeType: string;
  createdAt: string;
}

export interface LogoElement {
  id: string;
  type: 'logo';
  label: string;
  /** id of the stored image (see StoredAsset) */
  assetId?: string;
  mimeType?: string;
  /** natural pixel size of the stored image */
  naturalW?: number;
  naturalH?: number;
  widthMm: number;
  /** alignment when the logo is on its own row ("above") */
  align: Align;
  /** older saved letterheads have no value here, which means "above" */
  placement?: LogoPlacement;
  spaceBeforePt: number;
  spaceAfterPt: number;
}

export interface TextElement {
  id: string;
  type: 'text';
  /** only used in the builder UI, e.g. "School name" */
  label: string;
  /** may contain {Tokens} that are filled in per document */
  text: string;
  style: TextStyle;
}

export interface DividerElement {
  id: string;
  type: 'divider';
  label: string;
  thicknessPt: number;
  lineStyle: LineStyle;
  color: string;
  spaceBeforePt: number;
  spaceAfterPt: number;
}

export type LetterheadElement = LogoElement | TextElement | DividerElement;

export type DetailKind = 'text' | 'date' | 'timeRange';

export interface DetailField {
  id: string;
  label: string;
  kind: DetailKind;
}

export interface BodySettings {
  fontFamily: string;
  textSizePt: number;
  questionSizePt: number;
  color: string;
  /** line drawn between the instructions and the questions */
  rule: boolean;
  ruleColor: string;
}

export interface Letterhead {
  id: string;
  name: string;
  /** which tool owns it: letterheads (letters) or exam papers */
  kind: DocKind;
  tags: string[];
  /** download file name, e.g. "{Subject Code} {Subject}" -> "247 Maths"; unset = automatic */
  fileNamePattern?: string;
  /** letters: pre-filled body text (rich-text HTML) for every new letter */
  defaultBody: string;
  placement: Placement;
  page: { size: PageSize; marginMm: number };
  /** brand colours offered as quick swatches in every colour field */
  palette: string[];
  /** optional background behind the whole header block */
  bandColor: string | null;
  /** optional border around the whole header block */
  frame: { enabled: boolean; color: string; widthPt: number };
  elements: LetterheadElement[];
  detailFields: DetailField[];
  body: BodySettings;
  instructionsHeading: string;
  defaultInstructions: string[];
  maxMarks: { enabled: boolean; label: string };
  viva: { enabled: boolean; label: string };
  marksUnit: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaperImage {
  assetId: string;
  mimeType: string;
  naturalW: number;
  naturalH: number;
  size: ImageSizeKey;
}

export interface PaperQuestion {
  id: string;
  text: string;
  marks: string;
  image?: PaperImage;
}

export interface PaperDoc {
  id: string;
  letterheadId: string;
  /** same as the letterhead's kind; stored so lists can be queried by tool */
  kind: DocKind;
  title: string;
  /** values for the {Tokens} used in the letterhead */
  fields: Record<string, string>;
  /** values for the detail fields, keyed by DetailField.id. timeRange is "HH:MM|HH:MM". */
  details: Record<string, string>;
  instructions: string[];
  maxMarks: string;
  questions: PaperQuestion[];
  vivaMarks: string;
  /** letter mode: rich-text HTML (older documents hold plain text, one paragraph per line) */
  letterBody: string;
  createdAt: string;
  updatedAt: string;
}
