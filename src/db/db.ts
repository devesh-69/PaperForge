import Dexie, { type EntityTable } from 'dexie';
import type { Template, QuestionSet } from '../types';

const db = new Dexie('QuestionPaperBuilderDB') as Dexie & {
  templates: EntityTable<Template, 'id'>;
  questionSets: EntityTable<QuestionSet, 'id'>;
};

db.version(1).stores({
  templates: 'id, name, *tags, createdAt, updatedAt',
  questionSets: 'id, templateId, title, createdAt',
});

export default db;
export { db };
