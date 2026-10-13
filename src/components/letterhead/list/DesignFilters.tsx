import React from 'react';
import { SearchBox } from '../../common/SearchBox';

export type DesignSort = 'updated' | 'created' | 'name';

interface Props {
  search: string;
  onSearch: (v: string) => void;
  tag: string;
  onTag: (v: string) => void;
  allTags: string[];
  sort: DesignSort;
  onSort: (v: DesignSort) => void;
  noun: string;
}

/** Search, tag filter, sort and Clear for the design grid. */
export const DesignFilters: React.FC<Props> = ({ search, onSearch, tag, onTag, allTags, sort, onSort, noun }) => (
  <div className="d-flex gap-2 mb-4 flex-wrap align-items-center">
    <SearchBox id="design-search" value={search} onChange={onSearch} placeholder={`Search ${noun}…`} />
    {allTags.length > 0 && (
      <select className="form-select w-auto" aria-label="Filter by tag" value={tag} onChange={(e) => onTag(e.target.value)}>
        <option value="">All tags</option>
        {allTags.map((t) => <option key={t} value={t}>{t}</option>)}
      </select>
    )}
    <select className="form-select w-auto" aria-label="Sort" value={sort} onChange={(e) => onSort(e.target.value as DesignSort)}>
      <option value="updated">Recently edited</option>
      <option value="created">Newest first</option>
      <option value="name">Name A–Z</option>
    </select>
    {(search || tag) && (
      <button type="button" className="btn-icon" onClick={() => { onSearch(''); onTag(''); }}>
        <i className="bi bi-x-lg"></i> Clear
      </button>
    )}
  </div>
);
