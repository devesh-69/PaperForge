import Dexie, { type EntityTable } from 'dexie';
import { v4 as uuidv4 } from 'uuid';
import type { Template, QuestionSet } from '../types';
import type { Letterhead, PaperDoc, StoredAsset } from '../letterhead/types';

const db = new Dexie('QuestionPaperBuilderDB') as Dexie & {
  templates: EntityTable<Template, 'id'>;
  questionSets: EntityTable<QuestionSet, 'id'>;
  letterheads: EntityTable<Letterhead, 'id'>;
  papers: EntityTable<PaperDoc, 'id'>;
  assets: EntityTable<StoredAsset, 'id'>;
};

db.version(1).stores({
  templates: 'id, name, *tags, createdAt, updatedAt',
  questionSets: 'id, templateId, title, createdAt',
});

// v2: letterheads + papers (additive)
db.version(2).stores({
  templates: 'id, name, *tags, createdAt, updatedAt',
  questionSets: 'id, templateId, title, createdAt',
  letterheads: 'id, name, updatedAt',
  papers: 'id, letterheadId, updatedAt',
});

// v3: images move to their own table (so lists never load image bytes), designs
// and documents get a `kind` + tags, and list queries get compound indexes.
db.version(3)
  .stores({
    templates: 'id, name, *tags, createdAt, updatedAt',
    questionSets: 'id, templateId, title, createdAt',
    letterheads: 'id, kind, name, updatedAt, *tags',
    papers: 'id, letterheadId, kind, title, updatedAt, [kind+updatedAt], [letterheadId+updatedAt]',
    assets: 'id, createdAt',
  })
  .upgrade(async (tx) => {
    /* eslint-disable @typescript-eslint/no-explicit-any */
    const assets = tx.table('assets');
    const stash = async (dataUrl: string, mimeType: string): Promise<string> => {
      const id = uuidv4();
      await assets.add({ id, dataUrl, mimeType, createdAt: new Date().toISOString() });
      return id;
    };

    const kindById = new Map<string, string>();
    for (const lh of (await tx.table('letterheads').toArray()) as any[]) {
      kindById.set(lh.id, lh.kind ?? 'letter');
      const elements = [];
      for (const el of lh.elements ?? []) {
        if (el.type === 'logo' && el.dataUrl) {
          const { dataUrl, ...rest } = el;
          elements.push({ ...rest, assetId: await stash(dataUrl, el.mimeType ?? 'image/png') });
        } else {
          elements.push(el);
        }
      }
      await tx.table('letterheads').put({ ...lh, elements, tags: lh.tags ?? [], defaultBody: lh.defaultBody ?? '' });
    }

    for (const p of (await tx.table('papers').toArray()) as any[]) {
      const questions = [];
      for (const q of p.questions ?? []) {
        if (q.image?.dataUrl) {
          const { dataUrl, ...img } = q.image;
          questions.push({ ...q, image: { ...img, assetId: await stash(dataUrl, q.image.mimeType ?? 'image/png') } });
        } else {
          questions.push(q);
        }
      }
      await tx.table('papers').put({ ...p, questions, kind: p.kind ?? kindById.get(p.letterheadId) ?? 'letter' });
    }
    /* eslint-enable @typescript-eslint/no-explicit-any */
  });

export { db };
