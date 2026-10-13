import React, { useEffect, useId, useState } from 'react';
import { contrastRatio, normalizeHex } from '../../../letterhead/color';

interface Props {
  label?: string;
  value: string;
  onChange: (hex: string) => void;
  /** brand colours offered as one-click swatches */
  palette?: string[];
  /** colour the value sits on (to warn about unreadable text) */
  against?: string;
}

/** Colour picker + validated hex box + palette swatches. */
export const ColorField: React.FC<Props> = ({ label, value, onChange, palette = [], against }) => {
  const id = useId();
  const [text, setText] = useState(value);
  useEffect(() => { setText(value); }, [value]);

  const valid = normalizeHex(text) !== null;
  const low = against && normalizeHex(value) && normalizeHex(against) ? contrastRatio(value, against) < 3 : false;

  return (
    <div>
      {label && <label htmlFor={id} className="lh-fill-label">{label}</label>}
      <div className="lh-color">
        <input
          type="color"
          aria-label={`${label ?? 'Colour'} picker`}
          value={normalizeHex(value) ?? '#000000'}
          onChange={(e) => onChange(e.target.value.toLowerCase())}
        />
        <input
          id={id}
          className={`form-control form-control-sm lh-hex ${valid ? '' : 'is-invalid'}`}
          value={text}
          maxLength={7}
          spellCheck={false}
          placeholder="#rrggbb"
          onChange={(e) => {
            setText(e.target.value);
            const hex = normalizeHex(e.target.value);
            if (hex) onChange(hex);
          }}
          onBlur={() => setText(value)}
        />
        {palette.map((c) => (
          <button
            key={c}
            type="button"
            className={`lh-swatch ${normalizeHex(value) === c ? 'on' : ''}`}
            style={{ background: c }}
            title={c}
            aria-label={`Use ${c}`}
            onClick={() => onChange(c)}
          />
        ))}
      </div>
      {!valid && <div className="lh-field-error">Enter a hex colour like #7030a0</div>}
      {low && (
        <div className="lh-field-error text-warning">
          <i className="bi bi-exclamation-triangle-fill me-1"></i>Low contrast — hard to read on this background.
        </div>
      )}
    </div>
  );
};
