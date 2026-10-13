import React, { useMemo, useState } from 'react';
import type { Letterhead } from '../../../letterhead/types';
import type { ToolConfig } from '../../../letterhead/tools';
import { useDebouncedValue } from '../../../hooks/useDebouncedValue';
import { DesignCard } from './DesignCard';
import { DesignFilters, type DesignSort } from './DesignFilters';
import { EmptyState } from './EmptyState';

interface Props {
  tool: ToolConfig;
  designs: Letterhead[];
  counts: Record<string, number>;
  onCreate: () => void;
  onMakeDocument: (d: Letterhead) => void;
  onEdit: (d: Letterhead) => void;
  onDuplicate: (d: Letterhead) => void;
  onDelete: (d: Letterhead) => void;
}

/** Cards load in batches so a library with hundreds of designs stays quick. */
const BATCH = 24;

const SORTERS: Record<DesignSort, (a: Letterhead, b: Letterhead) => number> = {
  updated: (a, b) => b.updatedAt.localeCompare(a.updatedAt),
  created: (a, b) => b.createdAt.localeCompare(a.createdAt),
  name: (a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }),
};

export const DesignsTab: React.FC<Props> = ({ tool, designs, counts, onCreate, onMakeDocument, onEdit, onDuplicate, onDelete }) => {
  const [search, setSearch] = useState('');
  const [tag, setTag] = useState('');
  const [sort, setSort] = useState<DesignSort>('updated');
  const [shown, setShown] = useState(BATCH);
  const q = useDebouncedValue(search.trim().toLowerCase(), 200);

  const allTags = useMemo(() => [...new Set(designs.flatMap((d) => d.tags))].sort((a, b) => a.localeCompare(b)), [designs]);

  const filtered = useMemo(
    () =>
      designs
        .filter((d) => (!tag || d.tags.includes(tag)) && (!q || d.name.toLowerCase().includes(q) || d.tags.some((t) => t.toLowerCase().includes(q))))
        .sort(SORTERS[sort]),
    [designs, q, tag, sort],
  );

  if (designs.length === 0) {
    return (
      <EmptyState
        icon={tool.designIcon}
        title={`No ${tool.designPlural} yet`}
        hint={`Create one with your logo, name and colours, then reuse it for every ${tool.docSingular}.`}
        actionLabel={`Create your first ${tool.designSingular}`}
        onAction={onCreate}
      />
    );
  }

  return (
    <>
      <DesignFilters
        search={search}
        onSearch={(v) => { setSearch(v); setShown(BATCH); }}
        tag={tag}
        onTag={(v) => { setTag(v); setShown(BATCH); }}
        allTags={allTags}
        sort={sort}
        onSort={setSort}
        noun={tool.designPlural}
      />

      {filtered.length === 0 ? (
        <EmptyState icon="bi-search" title="No results" hint={`No ${tool.designPlural} match your search or tag filter.`} />
      ) : (
        <>
          <div className="row g-3">
            {filtered.slice(0, shown).map((d) => (
              <div key={d.id} className="col-12 col-md-6 col-xl-4">
                <DesignCard
                  tool={tool}
                  design={d}
                  documentCount={counts[d.id] ?? 0}
                  onMakeDocument={() => onMakeDocument(d)}
                  onEdit={() => onEdit(d)}
                  onDuplicate={() => onDuplicate(d)}
                  onDelete={() => onDelete(d)}
                  onTagClick={(t) => { setTag(t); setShown(BATCH); }}
                />
              </div>
            ))}
          </div>
          {filtered.length > shown && (
            <div className="text-center mt-4">
              <button type="button" className="btn-outline-black" onClick={() => setShown((n) => n + BATCH)}>
                Show more ({filtered.length - shown} left)
              </button>
            </div>
          )}
        </>
      )}
    </>
  );
};
