import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Question } from '../../types';
import { htmlToText } from '../../utils/html';

interface Props {
  question: Question;
  isActive: boolean;
  /** True when this question currently has export-blocking validation errors. */
  hasError?: boolean;
  onClick: (qNumber: number) => void;
  onDelete: (qNumber: number) => void;
}

export const SortableQuestionRow: React.FC<Props> = ({ question, isActive, hasError, onClick, onDelete }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: question.id });

  const preview = htmlToText(question.questionText.html) || question.subject || '—';

  return (
    <div
      ref={setNodeRef}
      className={`d-flex align-items-center gap-2 px-2 py-1 mb-1 sortable-row ${isActive ? 'active' : ''}`}
      role="button"
      tabIndex={0}
      onClick={() => onClick(question.qNumber)}
      onKeyDown={(e) => {
        // ignore Enter pressed on the nested drag/delete buttons
        if (e.key === 'Enter' && e.target === e.currentTarget) onClick(question.qNumber);
      }}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }}
    >
      {/* Drag handle */}
      <button
        type="button"
        className="btn-icon sortable-row-drag-handle"
        {...attributes}
        {...listeners}
        onClick={(e) => e.stopPropagation()}
        title="Drag to reorder"
        aria-label="Drag handle"
      >
        <i className="bi bi-grip-vertical"></i>
      </button>

      {/* Question number badge */}
      <span className="fw-700 flex-shrink-0 sortable-row-qnum">
        Q{question.qNumber}
      </span>

      {/* Preview text */}
      <span
        className="text-muted text-truncate"
        style={{ fontSize: '0.75rem', flex: 1 }}
        title={preview}
      >
        {preview}
      </span>

      {hasError && (
        <i
          className="bi bi-exclamation-circle-fill text-danger flex-shrink-0"
          style={{ fontSize: '0.8rem' }}
          title="This question has errors that block export"
          aria-label="Has errors"
        ></i>
      )}

      {/* Delete button */}
      <button
        type="button"
        className="btn-icon danger"
        style={{ padding: '0.15rem 0.35rem', fontSize: '0.7rem', flexShrink: 0 }}
        onClick={(e) => { e.stopPropagation(); onDelete(question.qNumber); }}
        title={`Delete Q${question.qNumber}`}
        aria-label={`Delete question ${question.qNumber}`}
      >
        <i className="bi bi-trash"></i>
      </button>
    </div>
  );
};
