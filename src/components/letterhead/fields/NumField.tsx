import React, { useEffect, useId, useState } from 'react';

interface Props {
  label?: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  suffix?: string;
  onChange: (n: number) => void;
}

// Keeps its own text while typing so "1." or an empty box never fights the user;
// commits only valid numbers, and snaps back to the last good value on blur.
export const NumField: React.FC<Props> = ({ label, value, min, max, step = 1, suffix, onChange }) => {
  const id = useId();
  const [text, setText] = useState(String(value));
  useEffect(() => { setText(String(value)); }, [value]);

  const parsed = Number(text);
  const invalid = text.trim() === '' || !Number.isFinite(parsed) || parsed < min || parsed > max;

  return (
    <div>
      {label && <label htmlFor={id} className="lh-fill-label">{label}</label>}
      <div className="input-group input-group-sm">
        <input
          id={id}
          className={`form-control ${invalid ? 'is-invalid' : ''}`}
          inputMode="decimal"
          value={text}
          step={step}
          aria-describedby={invalid ? `${id}-err` : undefined}
          onChange={(e) => {
            setText(e.target.value);
            const n = Number(e.target.value);
            if (e.target.value.trim() !== '' && Number.isFinite(n) && n >= min && n <= max) onChange(n);
          }}
          onBlur={() => setText(String(value))}
        />
        {suffix && <span className="input-group-text">{suffix}</span>}
      </div>
      {invalid && <div id={`${id}-err`} className="lh-field-error">{min}–{max}</div>}
    </div>
  );
};
