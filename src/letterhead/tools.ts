import type { DocKind } from './types';
import type { PresetKey } from './defaults';

/**
 * The two document tools share one engine but are separate products in the app:
 * "Letterheads" (letters and notices) and "Exam Papers". Everything that differs
 * (names, routes, starting points, backup scope) lives here, so pages and
 * components are written once and driven by this config.
 */
export interface ToolConfig {
  kind: DocKind;
  /** list page, e.g. /letterheads; builder routes are `${base}/new` and `${base}/edit/:id` */
  base: string;
  /** path prefix of the document editor, e.g. /letters -> /letters/:id */
  docBase: string;
  navLabel: string;
  navIcon: string;
  /** page title split so the second half can be accented */
  titleLead: string;
  titleAccent: string;
  tagline: string;
  designSingular: string;
  designPlural: string;
  docSingular: string;
  docPlural: string;
  newDesignLabel: string;
  makeDocLabel: string;
  designIcon: string;
  docIcon: string;
  presets: PresetKey[];
  backupScope: 'letters' | 'examPapers';
  backupName: string;
}

export const LETTER_TOOL: ToolConfig = {
  kind: 'letter',
  base: '/letterheads',
  docBase: '/letters',
  navLabel: 'Letterheads',
  navIcon: 'bi-file-earmark-richtext-fill',
  titleLead: 'Letter',
  titleAccent: 'heads',
  tagline: 'Design a letterhead once, then write letters and notices on it.',
  designSingular: 'letterhead',
  designPlural: 'letterheads',
  docSingular: 'letter',
  docPlural: 'letters',
  newDesignLabel: 'New Letterhead',
  makeDocLabel: 'Write a letter',
  designIcon: 'bi-envelope-paper',
  docIcon: 'bi-file-earmark-text',
  presets: ['letter', 'letterBlank'],
  backupScope: 'letters',
  backupName: 'letterheads',
};

export const EXAM_TOOL: ToolConfig = {
  kind: 'paper',
  base: '/exam-papers',
  docBase: '/papers',
  navLabel: 'Exam Papers',
  navIcon: 'bi-journal-text',
  titleLead: 'Exam ',
  titleAccent: 'Papers',
  tagline: 'Set up a paper format once, then make question papers from it.',
  designSingular: 'paper format',
  designPlural: 'paper formats',
  docSingular: 'exam paper',
  docPlural: 'exam papers',
  newDesignLabel: 'New Paper Format',
  makeDocLabel: 'Make a paper',
  designIcon: 'bi-layout-text-window-reverse',
  docIcon: 'bi-journal-text',
  presets: ['exam', 'examBlank'],
  backupScope: 'examPapers',
  backupName: 'exam papers',
};

const TOOLS: Record<DocKind, ToolConfig> = { letter: LETTER_TOOL, paper: EXAM_TOOL };

export const toolForKind = (kind: DocKind): ToolConfig => TOOLS[kind];

export const documentPath = (kind: DocKind, id: string): string => `${TOOLS[kind].docBase}/${id}`;
export const designEditPath = (kind: DocKind, id: string): string => `${TOOLS[kind].base}/edit/${id}`;
