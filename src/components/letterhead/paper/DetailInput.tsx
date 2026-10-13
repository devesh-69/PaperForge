import React from 'react';
import type { DetailField } from '../../../letterhead/types';
import { TimeField } from '../../common/TimeField';

interface Props {
  field: DetailField;
  value: string;
  onChange: (v: string) => void;
}

/** One input of the details table: text, date, or a from–to time range (12-hour). */
export const DetailInput: React.FC<Props> = ({ field, value, onChange }) => {
  const id = `det-${field.id}`;
  if (field.kind === 'timeRange') {
    const [from = '', to = ''] = value.split('|');
    return (
      <div className="col-sm-6">
        <div className="lh-fill-label">{field.label}</div>
        <div className="d-flex align-items-center gap-2 flex-wrap">
          <TimeField label={`${field.label} from`} value={from} onChange={(v) => onChange(`${v}|${to}`)} />
          <span className="text-muted small">to</span>
          <TimeField label={`${field.label} to`} value={to} onChange={(v) => onChange(`${from}|${v}`)} />
        </div>
      </div>
    );
  }
  return (
    <div className="col-sm-6">
      <label className="lh-fill-label" htmlFor={id}>{field.label}</label>
      <input id={id} type={field.kind === 'date' ? 'date' : 'text'} className="form-control" value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
};
