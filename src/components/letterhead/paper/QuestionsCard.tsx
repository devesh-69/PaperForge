import React, { useCallback } from 'react';
import toast from 'react-hot-toast';
import { v4 as uuidv4 } from 'uuid';
import { saveAsset } from '../../../letterhead/assets';
import { QUESTION_IMAGE_MAX_PX } from '../../../letterhead/defaults';
import type { Letterhead, PaperDoc, PaperQuestion } from '../../../letterhead/types';
import { moveItem } from '../../../utils/arrays';
import { processImageFile } from '../../../utils/imageUtils';
import { sanitizeMarks } from '../../../utils/numberInput';
import { FormCard } from '../FormCard';
import { QuestionRow } from './QuestionRow';

interface Props {
  lh: Letterhead;
  doc: PaperDoc;
  update: (fn: (d: PaperDoc) => PaperDoc) => void;
}

export const QuestionsCard: React.FC<Props> = ({ lh, doc, update }) => {
  // Stable handlers (depend only on `update`) so unchanged rows are not re-rendered on every keystroke.
  const change = useCallback(
    (id: string, patch: Partial<PaperQuestion>) =>
      update((d) => ({ ...d, questions: d.questions.map((q) => (q.id === id ? { ...q, ...patch } : q)) })),
    [update],
  );
  const move = useCallback(
    (id: string, dir: -1 | 1) =>
      update((d) => {
        const i = d.questions.findIndex((q) => q.id === id);
        return i < 0 ? d : { ...d, questions: moveItem(d.questions, i, dir) };
      }),
    [update],
  );
  const remove = useCallback(
    (id: string) => update((d) => ({ ...d, questions: d.questions.filter((q) => q.id !== id) })),
    [update],
  );
  const attachImage = useCallback(
    async (id: string, file: File) => {
      try {
        const img = await processImageFile(file, QUESTION_IMAGE_MAX_PX);
        const assetId = await saveAsset(img.dataUrl, img.mimeType);
        update((d) => ({
          ...d,
          questions: d.questions.map((q) =>
            q.id === id
              ? { ...q, image: { assetId, mimeType: img.mimeType, naturalW: img.widthPx, naturalH: img.heightPx, size: q.image?.size ?? 'M' } }
              : q,
          ),
        }));
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Could not add the image.');
      }
    },
    [update],
  );

  const total = doc.questions.reduce((s, q) => s + (parseFloat(q.marks) || 0), 0);

  return (
    <FormCard icon="bi-question-circle" title="Questions">
      {doc.questions.map((q, i) => (
        <QuestionRow
          key={q.id}
          index={i}
          question={q}
          isFirst={i === 0}
          isLast={i === doc.questions.length - 1}
          unit={lh.marksUnit}
          onChange={change}
          onMove={move}
          onRemove={remove}
          onImage={(id, file) => void attachImage(id, file)}
        />
      ))}
      <div className="d-flex flex-wrap gap-3 align-items-end">
        <button
          type="button"
          className="btn-outline-black"
          onClick={() => update((d) => ({ ...d, questions: [...d.questions, { id: uuidv4(), text: '', marks: '' }] }))}
        >
          <i className="bi bi-plus-lg"></i>Add question
        </button>
        {lh.viva.enabled && (
          <div className="lh-narrow-field">
            <label className="lh-fill-label" htmlFor="pd-viva">{lh.viva.label} marks</label>
            <input
              id="pd-viva"
              className="form-control"
              inputMode="decimal"
              value={doc.vivaMarks}
              onChange={(e) => update((d) => ({ ...d, vivaMarks: sanitizeMarks(e.target.value) }))}
            />
          </div>
        )}
        <span className="text-muted small ms-auto">
          Questions total {+total.toFixed(2)} {lh.marksUnit}
          {lh.viva.enabled && doc.vivaMarks ? ` + ${lh.viva.label} ${doc.vivaMarks} ${lh.marksUnit}` : ''}
        </span>
      </div>
    </FormCard>
  );
};
