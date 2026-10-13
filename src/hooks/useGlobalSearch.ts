import { useEffect, useState } from 'react';
import { db } from '../db/db';
import { CREATE_ACTIONS, NAV_GROUPS } from '../components/layout/navConfig';
import { documentPath, EXAM_TOOL, LETTER_TOOL } from '../letterhead/tools';

export interface SearchItem {
  id: string;
  group: string;
  label: string;
  sub?: string;
  icon: string;
  to: string;
}

const LIMIT_PER_GROUP = 5;

const includes = (haystack: string, q: string) => haystack.toLowerCase().includes(q);

/** Pages and "create" shortcuts, always available (no database). */
function staticItems(q: string): SearchItem[] {
  const pages = NAV_GROUPS.flatMap((g) => g.items).map<SearchItem>((n) => ({ id: `go:${n.to}`, group: 'Go to', label: n.label, icon: n.icon, to: n.to }));
  const creates = CREATE_ACTIONS.map<SearchItem>((a) => ({ id: `new:${a.to}`, group: 'Create', label: `New ${a.label.toLowerCase()}`, sub: a.hint, icon: 'bi-plus-lg', to: a.to }));
  return [...pages, ...creates].filter((i) => !q || includes(i.label, q));
}

/**
 * Finds things by name across the whole workspace. It works from indexed keys wherever
 * possible, so searching never loads big records (question sets, documents with images).
 */
async function searchData(q: string): Promise<SearchItem[]> {
  const out: SearchItem[] = [];

  const templates = (await db.templates.toArray()).filter((t) => includes(t.name, q)).slice(0, LIMIT_PER_GROUP);
  templates.forEach((t) => out.push({ id: `t:${t.id}`, group: 'Templates', label: t.name, sub: t.tags.join(', ') || undefined, icon: 'bi-grid-3x3-gap', to: `/templates/edit/${t.id}` }));

  const sets = db.questionSets.orderBy('title');
  const [setTitles, setIds] = await Promise.all([sets.keys(), sets.primaryKeys()]);
  let n = 0;
  setTitles.forEach((title, i) => {
    if (n < LIMIT_PER_GROUP && includes(String(title), q)) {
      n++;
      out.push({ id: `qs:${setIds[i]}`, group: 'Question sets', label: String(title), icon: 'bi-collection', to: `/question-set/${setIds[i]}` });
    }
  });

  const designs = (await db.letterheads.toArray()).filter((d) => includes(d.name, q)).slice(0, LIMIT_PER_GROUP * 2);
  designs.forEach((d) => {
    const tool = d.kind === 'paper' ? EXAM_TOOL : LETTER_TOOL;
    out.push({ id: `d:${d.id}`, group: tool.designPlural[0].toUpperCase() + tool.designPlural.slice(1), label: d.name, icon: tool.designIcon, to: `${tool.base}/edit/${d.id}` });
  });

  const docs = db.papers.orderBy('title');
  const [docTitles, docIds] = await Promise.all([docs.keys(), docs.primaryKeys()]);
  const hits: { id: string; title: string }[] = [];
  docTitles.forEach((title, i) => {
    if (hits.length < LIMIT_PER_GROUP * 2 && String(title) && includes(String(title), q)) hits.push({ id: String(docIds[i]), title: String(title) });
  });
  if (hits.length > 0) {
    const rows = await db.papers.bulkGet(hits.map((h) => h.id));
    rows.forEach((row) => {
      if (!row) return;
      const tool = row.kind === 'paper' ? EXAM_TOOL : LETTER_TOOL;
      out.push({ id: `p:${row.id}`, group: tool.docPlural[0].toUpperCase() + tool.docPlural.slice(1), label: row.title, icon: tool.docIcon, to: documentPath(row.kind, row.id) });
    });
  }
  return out;
}

/** Results for the command palette: static pages/actions plus (once you type) matching data. */
export function useGlobalSearch(query: string, active: boolean): SearchItem[] {
  const [results, setResults] = useState<SearchItem[]>([]);

  useEffect(() => {
    if (!active) return;
    const q = query.trim().toLowerCase();
    let cancelled = false;
    const base = staticItems(q);
    setResults(base);
    if (!q) return;
    const t = window.setTimeout(() => {
      searchData(q)
        .then((found) => { if (!cancelled) setResults([...found, ...base]); })
        .catch(() => undefined);
    }, 150);
    return () => { cancelled = true; window.clearTimeout(t); };
  }, [query, active]);

  return results;
}
