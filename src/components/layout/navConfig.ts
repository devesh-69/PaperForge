import { EXAM_TOOL, LETTER_TOOL } from '../../letterhead/tools';
import type { WorkspaceCounts } from '../../hooks/useWorkspaceCounts';
import type { NavSection } from '../../routes/routeMeta';

export type CountKey = keyof WorkspaceCounts;

export interface NavItem {
  to: string;
  label: string;
  icon: string;
  section: NavSection;
  countKey?: CountKey;
}

export interface NavGroup {
  label?: string;
  items: NavItem[];
}

/** The sidebar. Add a tool here (plus its routes) and it appears everywhere. */
export const NAV_GROUPS: NavGroup[] = [
  { items: [{ to: '/home', label: 'Home', icon: 'bi-house-door', section: 'home' }] },
  {
    label: 'Question bank',
    items: [
      { to: '/templates', label: 'Templates', icon: 'bi-grid-3x3-gap', section: 'templates', countKey: 'templates' },
      { to: '/question-sets', label: 'Question sets', icon: 'bi-collection', section: 'questionSets', countKey: 'questionSets' },
    ],
  },
  {
    label: 'Documents',
    items: [
      { to: LETTER_TOOL.base, label: LETTER_TOOL.navLabel, icon: LETTER_TOOL.navIcon.replace('-fill', ''), section: 'letters', countKey: 'letterheads' },
      { to: EXAM_TOOL.base, label: EXAM_TOOL.navLabel, icon: EXAM_TOOL.navIcon, section: 'papers', countKey: 'examFormats' },
    ],
  },
  { label: 'Workspace', items: [{ to: '/backup', label: 'Backup & restore', icon: 'bi-shield-check', section: 'backup' }] },
];

export interface CreateAction {
  label: string;
  hint: string;
  icon: string;
  to: string;
}

/** The "+ New" menu and the "Create" group of the command palette. */
export const CREATE_ACTIONS: CreateAction[] = [
  { label: 'Question set', hint: 'From a template', icon: 'bi-collection', to: '/new-question-set' },
  { label: 'Template', hint: 'Reusable question structure', icon: 'bi-grid-3x3-gap', to: '/templates/new' },
  { label: 'Letterhead', hint: 'Then write letters on it', icon: 'bi-envelope-paper', to: `${LETTER_TOOL.base}/new?preset=letter` },
  { label: 'Exam paper format', hint: 'Then make papers from it', icon: 'bi-journal-text', to: `${EXAM_TOOL.base}/new?preset=exam` },
];
