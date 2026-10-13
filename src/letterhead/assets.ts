import { v4 as uuidv4 } from 'uuid';
import { db } from '../db/db';
import type { Letterhead, PaperDoc } from './types';

/** image id -> data URL, for everything a document needs while it is drawn or exported */
export type AssetUrls = ReadonlyMap<string, string>;

// Small in-memory cache so a card or preview does not re-read the same logo again and again.
const MAX_CACHED = 200;
const cache = new Map<string, string>();

function remember(id: string, dataUrl: string): void {
  cache.delete(id);
  cache.set(id, dataUrl);
  if (cache.size > MAX_CACHED) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
}

export async function saveAsset(dataUrl: string, mimeType: string): Promise<string> {
  const id = uuidv4();
  await db.assets.add({ id, dataUrl, mimeType, createdAt: new Date().toISOString() });
  remember(id, dataUrl);
  return id;
}

/** Reads the requested images (from cache first). Unknown ids are simply absent from the result. */
export async function loadAssets(ids: Iterable<string>): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  const missing: string[] = [];
  for (const id of new Set(ids)) {
    const hit = cache.get(id);
    if (hit !== undefined) out.set(id, hit);
    else missing.push(id);
  }
  if (missing.length > 0) {
    const rows = await db.assets.bulkGet(missing);
    rows.forEach((row) => {
      if (row) {
        remember(row.id, row.dataUrl);
        out.set(row.id, row.dataUrl);
      }
    });
  }
  return out;
}

/** Ids of every image a letterhead (and optionally one of its documents) uses. */
export function assetIdsOf(lh: Letterhead, doc?: PaperDoc): string[] {
  const ids: string[] = [];
  for (const el of lh.elements) if (el.type === 'logo' && el.assetId) ids.push(el.assetId);
  if (doc) for (const q of doc.questions) if (q.image) ids.push(q.image.assetId);
  return ids;
}

const ORPHAN_GRACE_MS = 24 * 60 * 60 * 1000;
let prunedThisSession = false;

/**
 * Deletes images nothing refers to any more (e.g. a logo uploaded and then cancelled).
 * Only images older than a day are touched, so drafts open in another tab are safe.
 * Runs at most once per page load.
 */
export async function pruneOrphanAssets(): Promise<void> {
  if (prunedThisSession) return;
  prunedThisSession = true;
  const cutoff = new Date(Date.now() - ORPHAN_GRACE_MS).toISOString();
  const old = await db.assets.where('createdAt').below(cutoff).primaryKeys();
  if (old.length === 0) return;

  const used = new Set<string>();
  await db.letterheads.each((lh) => assetIdsOf(lh).forEach((id) => used.add(id)));
  await db.papers.each((p) => p.questions.forEach((q) => { if (q.image) used.add(q.image.assetId); }));
  const orphans = old.filter((id) => !used.has(id));
  if (orphans.length > 0) await db.assets.bulkDelete(orphans);
}
