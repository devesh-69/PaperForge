import React, { useState, KeyboardEvent } from 'react';

interface Props {
  tags: string[];
  onChange: (tags: string[]) => void;
}

export const TagInput: React.FC<Props> = ({ tags, onChange }) => {
  const [inputValue, setInputValue] = useState('');

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag();
    } else if (e.key === 'Backspace' && inputValue === '' && tags.length > 0) {
      onChange(tags.slice(0, -1));
    }
  };

  const handleBlur = () => {
    addTag();
  };

  const addTag = () => {
    const trimmed = inputValue.trim().replace(/,$/, '');
    if (trimmed && !tags.includes(trimmed)) {
      onChange([...tags, trimmed]);
    }
    setInputValue('');
  };

  const removeTag = (indexToRemove: number) => {
    onChange(tags.filter((_, index) => index !== indexToRemove));
  };

  return (
    <div className="form-control d-flex flex-wrap gap-2 align-items-center" style={{ minHeight: '38px', height: 'auto', padding: '0.4rem 0.85rem' }}>
      {tags.map((tag, index) => (
        <span 
          key={index} 
          className="badge rounded-pill bg-orange-light text-orange border border-orange d-flex align-items-center gap-1" 
          style={{ fontSize: '0.85rem', fontWeight: 600, padding: '0.35em 0.65em' }}
        >
          {tag}
          <i 
            className="bi bi-x-circle-fill" 
            style={{ fontSize: '0.8rem', cursor: 'pointer', opacity: 0.8 }}
            onClick={(e) => {
              e.stopPropagation();
              removeTag(index);
            }}
          ></i>
        </span>
      ))}
      <input
        type="text"
        className="border-0 shadow-none flex-grow-1"
        style={{ minWidth: '120px', outline: 'none', background: 'transparent' }}
        placeholder={tags.length === 0 ? "e.g. iit jee, algebra" : ""}
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
      />
    </div>
  );
};
