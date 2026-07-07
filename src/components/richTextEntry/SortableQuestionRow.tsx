import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Question } from '../../types';

interface Props {
  question: Question;
  isActive: boolean;
  onClick: (qNumber: number) => void;
  onDelete: (qNumber: number) => void;
}

export const SortableQuestionRow: React.FC<Props> = ({ question, isActive, onClick, onDelete }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: question.id });

  return (
    <div
      ref={setNodeRef}
      className={`d-flex align-items-center gap-2 px-2 py-1 mb-1 sortable-row ${isActive ? 'active' : ''}`}
      role="button"
      tabIndex={0}
      onClick={() => onClick(question.qNumber)}
      onKeyDown={(e) => e.key === 'Enter' && onClick(question.qNumber)}
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
        title={question.subject}
      >
        {question.subject || '—'}
      </span>

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
