import React from 'react';

interface Props<T extends string> {
  label?: string;
  value: T;
  options: { value: T; label: React.ReactNode; title?: string }[];
  onChange: (v: T) => void;
}

/** Small "pick one" button group. */
export function SegmentedControl<T extends string>({ label, value, options, onChange }: Props<T>) {
  return (
    <div>
      {label && <div className="lh-fill-label">{label}</div>}
      <div className="lh-seg" role="group" aria-label={label}>
        {options.map((o) => (
          <button key={o.value} type="button" title={o.title} aria-pressed={value === o.value} onClick={() => onChange(o.value)}>
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}
