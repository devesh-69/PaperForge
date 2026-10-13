import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';

export interface WorkspaceCounts {
  templates: number;
  questionSets: number;
  /** letterhead designs */
  letterheads: number;
  letters: number;
  /** exam paper formats */
  examFormats: number;
  papers: number;
}

const EMPTY: WorkspaceCounts = { templates: 0, questionSets: 0, letterheads: 0, letters: 0, examFormats: 0, papers: 0 };

/** How much there is of everything. `count()` never loads records, so this stays cheap at any size. */
export function useWorkspaceCounts(): { counts: WorkspaceCounts; ready: boolean } {
  const counts = useLiveQuery(async (): Promise<WorkspaceCounts> => {
    const [templates, questionSets, letterheads, letters, examFormats, papers] = await Promise.all([
      db.templates.count(),
      db.questionSets.count(),
      db.letterheads.where('kind').equals('letter').count(),
      db.papers.where('kind').equals('letter').count(),
      db.letterheads.where('kind').equals('paper').count(),
      db.papers.where('kind').equals('paper').count(),
    ]);
    return { templates, questionSets, letterheads, letters, examFormats, papers };
  });
  return { counts: counts ?? EMPTY, ready: counts !== undefined };
}
