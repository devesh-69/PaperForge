import React, { useEffect, useRef, useState } from 'react';
import { useAssetUrls } from '../../../hooks/useAssetUrls';
import type { ImageSizeKey, PaperQuestion } from '../../../letterhead/types';
import { sanitizeMarks } from '../../../utils/numberInput';
import { SegmentedControl } from '../fields';

const SIZE_OPTIONS = (['S', 'M', 'L', 'Full'] as ImageSizeKey[]).map((s) => ({ value: s, label: s }));

interface Props {
  index: number;
  question: PaperQuestion;
  isFirst: boolean;
  isLast: boolean;
  unit: string;
  // The handlers take the question id, so the parent can pass the same functions to every row
  // and React.memo can skip rows that did not change (matters with 100+ questions).
  onChange: (id: string, patch: Partial<PaperQuestion>) => void;
  onMove: (id: string, dir: -1 | 1) => void;
  onRemove: (id: string) => void;
  onImage: (id: string, file: File) => void;
}

/** One question: text, marks, optional image (upload, paste or drop). */
const QuestionRowBase: React.FC<Props> = ({ index, question: q, isFirst, isLast, unit, onChange, onMove, onRemove, onImage }) => {
  const fileRef = useRef<HTMLInputElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const [drag, setDrag] = useState(false);
  const urls = useAssetUrls(q.image ? [q.image.assetId] : []);
  const thumb = q.image ? urls.get(q.image.assetId) : undefined;

  // auto-grow the textarea
  useEffect(() => {
    const t = taRef.current;
    if (!t) return;
    t.style.height = 'auto';
    t.style.height = `${t.scrollHeight + 2}px`;
  }, [q.text]);

  return (
    <div
      className={`lh-q-row ${drag ? 'drag' : ''}`}
      onDragOver={(e) => { if ([...e.dataTransfer.items].some((x) => x.type.startsWith('image/'))) { e.preventDefault(); setDrag(true); } }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => {
        setDrag(false);
        const f = [...e.dataTransfer.files].find((x) => x.type.startsWith('image/'));
        if (f) { e.preventDefault(); onImage(q.id, f); }
      }}
    >
      <span className="lh-q-tag">Q{index + 1}</span>
      <textarea
        ref={taRef}
        className="form-control"
        rows={1}
        placeholder="Type the question"
        aria-label={`Question ${index + 1}`}
        value={q.text}
        onChange={(e) => onChange(q.id, { text: e.target.value })}
        onPaste={(e) => {
          const f = [...(e.clipboardData?.items ?? [])].find((x) => x.type.startsWith('image/'))?.getAsFile();
          if (f) { e.preventDefault(); onImage(q.id, f); }
        }}
      />
      <div className="input-group">
        <input
          className="form-control text-end"
          inputMode="decimal"
          placeholder="0"
          aria-label={`Marks for Q${index + 1}`}
          value={q.marks}
          onChange={(e) => onChange(q.id, { marks: sanitizeMarks(e.target.value) })}
        />
        <span className="input-group-text">{unit}</span>
      </div>
      <div className="lh-q-actions">
        <div className="d-flex gap-1">
          <button type="button" className="btn-icon" aria-label="Move up" disabled={isFirst} onClick={() => onMove(q.id, -1)}><i className="bi bi-arrow-up"></i></button>
          <button type="button" className="btn-icon" aria-label="Move down" disabled={isLast} onClick={() => onMove(q.id, 1)}><i className="bi bi-arrow-down"></i></button>
        </div>
        <button type="button" className="btn-icon danger" aria-label={`Remove Q${index + 1}`} onClick={() => onRemove(q.id)}><i className="bi bi-trash3"></i></button>
      </div>

      <div className="lh-q-extra">
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) onImage(q.id, f); e.target.value = ''; }} />
        {q.image ? (
          <div className="d-flex flex-wrap gap-2 align-items-center border rounded p-2">
            {thumb && <img src={thumb} alt={`Figure for Q${index + 1}`} className="lh-q-thumb" />}
            <SegmentedControl
              value={q.image.size}
              options={SIZE_OPTIONS}
              onChange={(size) => onChange(q.id, { image: q.image ? { ...q.image, size } : q.image })}
            />
            <button type="button" className="btn-icon" onClick={() => fileRef.current?.click()}>Replace</button>
            <button type="button" className="btn-icon danger" onClick={() => onChange(q.id, { image: undefined })}>Remove image</button>
          </div>
        ) : (
          <>
            <button type="button" className="btn-icon" onClick={() => fileRef.current?.click()}><i className="bi bi-image"></i>Add image</button>
            <span className="text-muted small">or paste / drop one here</span>
          </>
        )}
      </div>
    </div>
  );
};

export const QuestionRow = React.memo(QuestionRowBase);
