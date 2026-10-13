import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGlobalSearch } from '../../hooks/useGlobalSearch';

interface Props {
  open: boolean;
  onClose: () => void;
}

/** Ctrl K: type to jump to a page, find any item by name, or start something new. */
export const CommandPalette: React.FC<Props> = ({ open, onClose }) => {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const results = useGlobalSearch(query, open);

  useEffect(() => {
    if (open) { setQuery(''); setSelected(0); window.setTimeout(() => inputRef.current?.focus(), 0); }
  }, [open]);
  useEffect(() => { setSelected(0); }, [query]);

  const groups = useMemo(() => {
    const map = new Map<string, typeof results>();
    results.forEach((r) => map.set(r.group, [...(map.get(r.group) ?? []), r]));
    return [...map.entries()];
  }, [results]);

  if (!open) return null;

  const go = (to: string) => { onClose(); navigate(to); };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelected((s) => Math.min(results.length - 1, s + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setSelected((s) => Math.max(0, s - 1)); }
    else if (e.key === 'Enter' && results[selected]) { e.preventDefault(); go(results[selected].to); }
    else if (e.key === 'Escape') { e.preventDefault(); onClose(); }
  };

  let index = -1;
  return (
    <div className="cmdk-back" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="cmdk" role="dialog" aria-modal="true" aria-label="Search or jump to" onKeyDown={onKeyDown}>
        <div className="cmdk-input">
          <i className="bi bi-search text-muted"></i>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search templates, question sets, letters, papers, or jump to a page…"
            aria-label="Search"
            role="combobox"
            aria-expanded="true"
            aria-controls="cmdk-results"
            autoComplete="off"
          />
          <kbd>Esc</kbd>
        </div>
        <div className="cmdk-list" id="cmdk-results" role="listbox">
          {results.length === 0 && <div className="cmdk-empty">No matches.</div>}
          {groups.map(([group, items]) => (
            <div key={group}>
              <div className="cmdk-group">{group}</div>
              {items.map((item) => {
                index++;
                const i = index;
                return (
                  <button
                    key={item.id}
                    type="button"
                    role="option"
                    aria-selected={i === selected}
                    className="cmdk-item"
                    onMouseEnter={() => setSelected(i)}
                    onClick={() => go(item.to)}
                  >
                    <i className={`bi ${item.icon}`}></i>
                    {item.label}
                    {item.sub && <small>{item.sub}</small>}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
