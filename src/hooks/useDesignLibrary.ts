import Dexie from 'dexie';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import type { DocKind, Letterhead, PaperDoc } from '../letterhead/types';

/** All designs (letterheads / paper formats) of one tool. They hold no image bytes, so this stays light. */
export function useDesigns(kind: DocKind): Letterhead[] | undefined {
  return useLiveQuery(() => db.letterheads.where('kind').equals(kind).toArray(), [kind]);
}

/** How many documents each design has, without loading the documents. */
export function useDocumentCounts(designIds: string[]): Record<string, number> | undefined {
  const key = designIds.join(',');
  return useLiveQuery(async () => {
    const entries = await Promise.all(
      designIds.map(async (id) => [id, await db.papers.where('letterheadId').equals(id).count()] as const),
    );
    return Object.fromEntries(entries);
  }, [key]);
}

export function useTotalDocuments(kind: DocKind): number | undefined {
  return useLiveQuery(() => db.papers.where('kind').equals(kind).count(), [kind]);
}

interface PageOptions {
  /** substring of the title (case-insensitive) */
  search: string;
  /** only documents of this design */
  designId: string;
  limit: number;
}

export interface DocumentPage {
  rows: PaperDoc[];
  hasMore: boolean;
}

/**
 * One page of documents, newest first, read through an index so only the rows
 * shown are loaded (not the whole table), however many documents exist.
 */
export function useDocumentPage(kind: DocKind, { search, designId, limit }: PageOptions): DocumentPage | undefined {
  return useLiveQuery(async () => {
    const base = designId
      ? db.papers.where('[letterheadId+updatedAt]').between([designId, Dexie.minKey], [designId, Dexie.maxKey])
      : db.papers.where('[kind+updatedAt]').between([kind, Dexie.minKey], [kind, Dexie.maxKey]);
    let coll = base.reverse();
    const q = search.trim().toLowerCase();
    if (q) coll = coll.filter((p) => (p.title || 'untitled document').toLowerCase().includes(q));
    const rows = await coll.limit(limit + 1).toArray();
    return { rows: rows.slice(0, limit), hasMore: rows.length > limit };
  }, [kind, search, designId, limit]);
}
