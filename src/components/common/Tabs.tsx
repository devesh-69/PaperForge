import React, { useId } from 'react';

export interface TabItem<T extends string> {
  id: T;
  label: string;
  /** small number next to the label */
  count?: number;
}

interface Props<T extends string> {
  tabs: TabItem<T>[];
  value: T;
  onChange: (id: T) => void;
  ariaLabel: string;
}

/** Accessible tab list (arrow keys move between tabs). The caller renders the panel for `value`. */
export function Tabs<T extends string>({ tabs, value, onChange, ariaLabel }: Props<T>) {
  const base = useId();

  const onKeyDown = (e: React.KeyboardEvent, index: number) => {
    const step = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    const next = tabs[(index + step + tabs.length) % tabs.length];
    onChange(next.id);
    document.getElementById(`${base}-${next.id}`)?.focus();
  };

  return (
    <div className="pf-tabs" role="tablist" aria-label={ariaLabel}>
      {tabs.map((t, i) => (
        <button
          key={t.id}
          id={`${base}-${t.id}`}
          type="button"
          role="tab"
          className="pf-tab"
          aria-selected={t.id === value}
          tabIndex={t.id === value ? 0 : -1}
          onClick={() => onChange(t.id)}
          onKeyDown={(e) => onKeyDown(e, i)}
        >
          {t.label}
          {t.count !== undefined && <span className="tab-count">{t.count}</span>}
        </button>
      ))}
    </div>
  );
}
