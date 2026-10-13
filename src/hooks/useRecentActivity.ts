import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { documentPath, EXAM_TOOL, LETTER_TOOL } from '../letterhead/tools';

export interface ActivityItem {
  id: string;
  /** "Question set", "Template", "Letter", "Exam paper" */
  kind: string;
  title: string;
  detail: string;
  when: string;
  icon: string;
  to: string;
}

const PER_SOURCE = 4;
const SHOWN = 6;

/**
 * The latest things worked on, across every tool. Each source is read through an index with a
 * small limit, so this costs the same whether the workspace holds ten items or ten thousand.
 */
export function useRecentActivity(): ActivityItem[] | undefined {
  return useLiveQuery(async () => {
    const [templates, sets, docs] = await Promise.all([
      db.templates.orderBy('updatedAt').reverse().limit(PER_SOURCE).toArray(),
      db.questionSets.orderBy('createdAt').reverse().limit(PER_SOURCE).toArray(),
      db.papers.orderBy('updatedAt').reverse().limit(PER_SOURCE).toArray(),
    ]);

    const items: ActivityItem[] = [
      ...templates.map((t): ActivityItem => ({
        id: `t:${t.id}`, kind: 'Template', title: t.name, when: t.updatedAt, icon: 'bi-grid-3x3-gap', to: `/templates/edit/${t.id}`,
        detail: t.maxQuestions ? `${t.maxQuestions} questions` : 'Unlimited questions',
      })),
      ...sets.map((s): ActivityItem => ({
        id: `qs:${s.id}`, kind: 'Question set', title: s.title, when: s.lastGeneratedAt ?? s.createdAt, icon: 'bi-collection', to: `/question-set/${s.id}`,
        detail: `${s.questions.length} question${s.questions.length === 1 ? '' : 's'}`,
      })),
      ...docs.map((d): ActivityItem => {
        const tool = d.kind === 'paper' ? EXAM_TOOL : LETTER_TOOL;
        return {
          id: `d:${d.id}`, kind: tool.docSingular[0].toUpperCase() + tool.docSingular.slice(1), title: d.title.trim() || `Untitled ${tool.docSingular}`,
          when: d.updatedAt, icon: tool.docIcon, to: documentPath(d.kind, d.id), detail: '',
        };
      }),
    ];
    return items.sort((a, b) => b.when.localeCompare(a.when)).slice(0, SHOWN);
  });
}
