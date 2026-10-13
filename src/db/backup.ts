import { v4 as uuidv4 } from 'uuid';
import { db } from './db';
import type { QuestionSet, Template } from '../types';
import { assetIdsOf } from '../letterhead/assets';
import type { DocKind, Letterhead, PaperDoc, StoredAsset } from '../letterhead/types';

const BACKUP_APP = 'PaperForge';
// v3: images are separate `assets`; letterheads/papers carry a kind. Older (v1/v2) files are still accepted.
const BACKUP_VERSION = 3;

/** What a backup covers: one tool's data, or everything. */
export type BackupScope = 'questions' | 'letters' | 'examPapers' | 'all';

const SCOPE_KIND: Partial<Record<BackupScope, DocKind>> = { letters: 'letter', examPapers: 'paper' };

interface BackupFile {
  app: string;
  version: number;
  scope?: BackupScope;
  exportedAt: string;
  templates: Template[];
  questionSets: QuestionSet[];
  letterheads?: Letterhead[];
  papers?: PaperDoc[];
  assets?: StoredAsset[];
}

export interface RestoreCounts {
  templates: number;
  questionSets: number;
  letterheads: number;
  papers: number;
}

export async function createBackupBlob(scope: BackupScope = 'all'): Promise<Blob> {
  const wantQuestions = scope === 'questions' || scope === 'all';
  const kind = SCOPE_KIND[scope];
  const wantDocs = scope === 'all' || kind !== undefined;

  const [templates, questionSets] = wantQuestions
    ? await Promise.all([db.templates.toArray(), db.questionSets.toArray()])
    : [[], []];

  let letterheads: Letterhead[] = [];
  let papers: PaperDoc[] = [];
  let assets: StoredAsset[] = [];
  if (wantDocs) {
    letterheads = kind ? await db.letterheads.where('kind').equals(kind).toArray() : await db.letterheads.toArray();
    papers = kind ? await db.papers.where('kind').equals(kind).toArray() : await db.papers.toArray();
    // only the images these designs and documents actually use
    const ids = new Set<string>();
    letterheads.forEach((l) => assetIdsOf(l).forEach((id) => ids.add(id)));
    papers.forEach((p) => p.questions.forEach((q) => { if (q.image) ids.add(q.image.assetId); }));
    const rows = await db.assets.bulkGet([...ids]);
    assets = rows.filter((r): r is StoredAsset => !!r);
  }

  const data: BackupFile = {
    app: BACKUP_APP,
    version: BACKUP_VERSION,
    scope,
    exportedAt: new Date().toISOString(),
    templates,
    questionSets,
    letterheads,
    papers,
    assets,
  };
  return new Blob([JSON.stringify(data)], { type: 'application/json' });
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

function assertBackup(data: unknown): asserts data is BackupFile {
  if (!isObj(data) || data.app !== BACKUP_APP) throw new Error('This is not a PaperForge backup file.');
  if (typeof data.version !== 'number' || data.version > BACKUP_VERSION) {
    throw new Error('This backup was made by a newer version of PaperForge.');
  }
  if (!Array.isArray(data.templates) || !Array.isArray(data.questionSets)) {
    throw new Error('The backup file is missing its templates or question sets.');
  }
  for (const t of data.templates) {
    if (!isObj(t) || typeof t.id !== 'string' || typeof t.name !== 'string' || !Array.isArray(t.subjectBlocks)) {
      throw new Error('The backup contains a malformed template.');
    }
  }
  for (const s of data.questionSets) {
    if (!isObj(s) || typeof s.id !== 'string' || typeof s.templateId !== 'string' || !Array.isArray(s.questions)) {
      throw new Error('The backup contains a malformed question set.');
    }
  }
  if (data.letterheads !== undefined) {
    if (!Array.isArray(data.letterheads)) throw new Error('The backup contains malformed letterheads.');
    for (const l of data.letterheads) {
      if (!isObj(l) || typeof l.id !== 'string' || typeof l.name !== 'string' || !Array.isArray(l.elements)) {
        throw new Error('The backup contains a malformed letterhead.');
      }
    }
  }
  if (data.papers !== undefined) {
    if (!Array.isArray(data.papers)) throw new Error('The backup contains malformed documents.');
    for (const p of data.papers) {
      if (!isObj(p) || typeof p.id !== 'string' || typeof p.letterheadId !== 'string' || !Array.isArray(p.questions)) {
        throw new Error('The backup contains a malformed document.');
      }
    }
  }
  if (data.assets !== undefined) {
    if (!Array.isArray(data.assets)) throw new Error('The backup contains malformed images.');
    for (const a of data.assets) {
      if (!isObj(a) || typeof a.id !== 'string' || typeof a.dataUrl !== 'string') throw new Error('The backup contains a malformed image.');
    }
  }
}

/** Brings records from older backups (inline images, no kind/tags) up to the current shape. */
function modernise(
  letterheads: Letterhead[],
  papers: PaperDoc[],
  assets: StoredAsset[],
): { letterheads: Letterhead[]; papers: PaperDoc[]; assets: StoredAsset[] } {
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const extra: StoredAsset[] = [];
  const stash = (dataUrl: string, mimeType: string): string => {
    const id = uuidv4();
    extra.push({ id, dataUrl, mimeType, createdAt: new Date().toISOString() });
    return id;
  };
  const kindById = new Map<string, DocKind>();

  const lhs = (letterheads as any[]).map((lh) => {
    const kind: DocKind = lh.kind === 'paper' ? 'paper' : 'letter';
    kindById.set(lh.id, kind);
    const elements = (lh.elements ?? []).map((el: any) => {
      if (el.type === 'logo' && el.dataUrl) {
        const { dataUrl, ...rest } = el;
        return { ...rest, assetId: stash(dataUrl, el.mimeType ?? 'image/png') };
      }
      return el;
    });
    return { ...lh, kind, tags: lh.tags ?? [], defaultBody: lh.defaultBody ?? '', elements } as Letterhead;
  });

  const docs = (papers as any[]).map((p) => {
    const questions = (p.questions ?? []).map((q: any) => {
      if (q.image?.dataUrl) {
        const { dataUrl, ...img } = q.image;
        return { ...q, image: { ...img, assetId: stash(dataUrl, q.image.mimeType ?? 'image/png') } };
      }
      return q;
    });
    return { ...p, questions, kind: p.kind ?? kindById.get(p.letterheadId) ?? 'letter' } as PaperDoc;
  });
  /* eslint-enable @typescript-eslint/no-explicit-any */
  return { letterheads: lhs, papers: docs, assets: [...assets, ...extra] };
}

/**
 * Merges a backup into the database; items with the same id are overwritten.
 * `scope` limits what is restored to one tool's data (a backup made for a
 * different tool is refused, so a letterhead backup can never be restored by
 * mistake into exam papers).
 */
export async function restoreBackup(file: File, scope: BackupScope = 'all'): Promise<RestoreCounts> {
  let data: unknown;
  try {
    data = JSON.parse(await file.text());
  } catch {
    throw new Error('The file is not valid JSON.');
  }
  assertBackup(data);

  if (scope !== 'all' && data.scope && data.scope !== 'all' && data.scope !== scope) {
    throw new Error('This backup belongs to a different tool. Use the Backup / Restore buttons on that tool\'s page.');
  }

  const kind = SCOPE_KIND[scope];
  const restoreQuestions = scope === 'questions' || scope === 'all';
  const restoreDocs = scope === 'all' || kind !== undefined;

  const templates = restoreQuestions ? data.templates : [];
  const questionSets = restoreQuestions ? data.questionSets : [];
  let { letterheads, papers, assets } = modernise(data.letterheads ?? [], data.papers ?? [], data.assets ?? []);
  if (!restoreDocs) {
    letterheads = []; papers = []; assets = [];
  } else if (kind) {
    letterheads = letterheads.filter((l) => l.kind === kind);
    papers = papers.filter((p) => p.kind === kind);
  }

  await db.transaction('rw', db.templates, db.questionSets, db.letterheads, db.papers, db.assets, async () => {
    await db.templates.bulkPut(templates);
    await db.questionSets.bulkPut(questionSets);
    await db.assets.bulkPut(assets);
    await db.letterheads.bulkPut(letterheads);
    await db.papers.bulkPut(papers);
  });
  return { templates: templates.length, questionSets: questionSets.length, letterheads: letterheads.length, papers: papers.length };
}
