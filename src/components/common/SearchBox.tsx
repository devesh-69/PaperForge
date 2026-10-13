import React from 'react';

interface Props {
  id: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}

export const SearchBox: React.FC<Props> = ({ id, value, onChange, placeholder = 'Search…' }) => (
  <div className="search-box">
    <i className="bi bi-search search-box-icon" aria-hidden="true"></i>
    <input
      id={id}
      type="search"
      className="form-control ps-4"
      placeholder={placeholder}
      aria-label={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  </div>
);
