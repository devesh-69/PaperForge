import React, { useState } from 'react';
import { useDebouncedValue } from '../../../hooks/useDebouncedValue';
import { useDocumentPage, useTotalDocuments } from '../../../hooks/useDesignLibrary';
import type { Letterhead, PaperDoc } from '../../../letterhead/types';
import type { ToolConfig } from '../../../letterhead/tools';
import { SearchBox } from '../../common/SearchBox';
import { DocumentRow } from './DocumentRow';
import { EmptyState } from './EmptyState';

interface Props {
  tool: ToolConfig;
  designs: Letterhead[];
  onOpen: (doc: PaperDoc) => void;
  onDelete: (doc: PaperDoc, name: string) => void;
}

const PAGE = 25;

/** Documents of one tool, read page by page through an index (never the whole table). */
export const DocumentsTab: React.FC<Props> = ({ tool, designs, onOpen, onDelete }) => {
  const [search, setSearch] = useState('');
  const [designId, setDesignId] = useState('');
  const [limit, setLimit] = useState(PAGE);
  const q = useDebouncedValue(search, 250);

  const total = useTotalDocuments(tool.kind);
  const page = useDocumentPage(tool.kind, { search: q, designId, limit });
  const byId = new Map(designs.map((d) => [d.id, d]));

  if (total === 0) {
    return <EmptyState icon={tool.docIcon} title={`No ${tool.docPlural} yet`} hint={`Open a ${tool.designSingular} and choose “${tool.makeDocLabel}”.`} />;
  }

  return (
    <>
      <div className="d-flex gap-2 mb-3 flex-wrap align-items-center">
        <SearchBox id="document-search" value={search} onChange={(v) => { setSearch(v); setLimit(PAGE); }} placeholder={`Search ${tool.docPlural} by name…`} />
        <select className="form-select w-auto" aria-label={`Filter by ${tool.designSingular}`} value={designId} onChange={(e) => { setDesignId(e.target.value); setLimit(PAGE); }}>
          <option value="">All {tool.designPlural}</option>
          {designs.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
        {(search || designId) && (
          <button type="button" className="btn-icon" onClick={() => { setSearch(''); setDesignId(''); setLimit(PAGE); }}>
            <i className="bi bi-x-lg"></i> Clear
          </button>
        )}
        <span className="text-muted small ms-auto">{total ?? '…'} total</span>
      </div>

      {page === undefined ? (
        <div className="text-center py-4"><div className="spinner-border spinner-border-sm text-secondary" role="status"></div></div>
      ) : page.rows.length === 0 ? (
        <EmptyState icon="bi-search" title="No results" hint={`No ${tool.docPlural} match your search.`} />
      ) : (
        <>
          <div className="card">
            <ul className="list-group list-group-flush">
              {page.rows.map((d) => {
                const name = d.title.trim() || `Untitled ${tool.docSingular}`;
                return (
                  <DocumentRow
                    key={d.id}
                    tool={tool}
                    doc={d}
                    design={byId.get(d.letterheadId) ?? null}
                    onOpen={() => onOpen(d)}
                    onDelete={() => onDelete(d, name)}
                  />
                );
              })}
            </ul>
          </div>
          {page.hasMore && (
            <div className="text-center mt-3">
              <button type="button" className="btn-outline-black" onClick={() => setLimit((n) => n + PAGE)}>Show more</button>
            </div>
          )}
        </>
      )}
    </>
  );
};
