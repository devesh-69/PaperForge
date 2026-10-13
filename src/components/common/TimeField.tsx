import React, { useEffect, useState } from 'react';

interface Props {
  /** 24-hour "HH:MM" (how it is stored), or "" when empty */
  value: string;
  onChange: (value: string) => void;
  /** accessible name, e.g. "Time from" */
  label: string;
}

type Period = 'AM' | 'PM';

function parse(value: string): { h: string; m: string; ap: Period } {
  const m = /^(\d{1,2}):(\d{2})$/.exec(value);
  if (!m) return { h: '', m: '', ap: 'AM' };
  const h24 = Number(m[1]);
  return { h: String(h24 % 12 === 0 ? 12 : h24 % 12), m: m[2], ap: h24 >= 12 ? 'PM' : 'AM' };
}

function toValue(h: string, m: string, ap: Period): string {
  const hour = Number(h);
  if (!h || !Number.isInteger(hour) || hour < 1 || hour > 12) return '';
  const minute = m === '' ? 0 : Number(m);
  if (!Number.isInteger(minute) || minute < 0 || minute > 59) return '';
  const h24 = (hour % 12) + (ap === 'PM' ? 12 : 0);
  return `${String(h24).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

/** A 12-hour time input (hour : minutes AM/PM). The browser's own time picker follows the OS and may show 24 hours. */
export const TimeField: React.FC<Props> = ({ value, onChange, label }) => {
  const initial = parse(value);
  const [h, setH] = useState(initial.h);
  const [m, setM] = useState(initial.m);
  const [ap, setAp] = useState<Period>(initial.ap);

  // follow outside changes (e.g. another document loaded), but not our own typing
  useEffect(() => {
    if (toValue(h, m, ap) === value) return;
    const p = parse(value);
    setH(p.h); setM(p.m); setAp(p.ap);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const commit = (nh: string, nm: string, nap: Period) => onChange(toValue(nh, nm, nap));

  return (
    <div className="time-field" role="group" aria-label={label}>
      <input
        className="form-control"
        inputMode="numeric"
        maxLength={2}
        placeholder="hh"
        aria-label={`${label}, hour (1 to 12)`}
        value={h}
        onChange={(e) => {
          const v = e.target.value.replace(/\D/g, '').slice(0, 2);
          setH(v);
          commit(v, m, ap);
        }}
        onBlur={() => { if (h && Number(h) > 12) { setH('12'); commit('12', m, ap); } else if (h === '0') { setH('12'); commit('12', m, ap); } }}
      />
      <span className="time-field-sep">:</span>
      <input
        className="form-control"
        inputMode="numeric"
        maxLength={2}
        placeholder="mm"
        aria-label={`${label}, minutes`}
        value={m}
        onChange={(e) => {
          const v = e.target.value.replace(/\D/g, '').slice(0, 2);
          setM(v);
          commit(h, v, ap);
        }}
        onBlur={() => {
          if (!h) return;
          const fixed = String(Math.min(59, Number(m || 0))).padStart(2, '0');
          setM(fixed);
          commit(h, fixed, ap);
        }}
      />
      <button
        type="button"
        className="time-field-ap"
        aria-label={`${label}, ${ap}. Press to switch AM and PM`}
        onClick={() => {
          const next: Period = ap === 'AM' ? 'PM' : 'AM';
          setAp(next);
          commit(h, m, next);
        }}
      >
        {ap}
      </button>
    </div>
  );
};
