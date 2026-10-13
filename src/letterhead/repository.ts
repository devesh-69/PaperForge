import { v4 as uuidv4 } from 'uuid';
import { db } from '../db/db';
import type { Letterhead, PaperDoc } from './types';

export async function saveLetterhead(lh: Letterhead): Promise<Letterhead> {
  const saved: Letterhead = { ...lh, name: lh.name.trim(), updatedAt: new Date().toISOString() };
  await db.letterheads.put(saved);
  return saved;
}

export async function duplicateLetterhead(id: string): Promise<void> {
  const lh = await db.letterheads.get(id);
  if (!lh) return;
  const now = new Date().toISOString();
  await db.letterheads.add({
    ...lh,
    id: uuidv4(),
    name: `${lh.name} (Copy)`,
    elements: lh.elements.map((e) => ({ ...e, id: uuidv4() })),
    detailFields: lh.detailFields.map((f) => ({ ...f, id: uuidv4() })),
    createdAt: now,
    updatedAt: now,
  });
}

/** Deletes a letterhead together with the documents made from it. */
export async function deleteLetterhead(id: string): Promise<void> {
  await db.transaction('rw', db.letterheads, db.papers, async () => {
    await db.papers.where('letterheadId').equals(id).delete();
    await db.letterheads.delete(id);
  });
}

export async function savePaper(doc: PaperDoc): Promise<void> {
  await db.papers.put({ ...doc, updatedAt: new Date().toISOString() });
}

export async function deletePaper(id: string): Promise<void> {
  await db.papers.delete(id);
}
