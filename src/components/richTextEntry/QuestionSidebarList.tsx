import React from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { SortableQuestionRow } from './SortableQuestionRow';
import type { Question } from '../../types';

interface Props {
  questions: Question[];
  activeQNumber: number;
  onSelect: (qNumber: number) => void;
  onReorder: (oldIndex: number, newIndex: number) => void;
  onDelete: (qNumber: number) => void;
}

export const QuestionSidebarList: React.FC<Props> = ({
  questions,
  activeQNumber,
  onSelect,
  onReorder,
  onDelete,
}) => {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = questions.findIndex((q) => q.id === active.id);
      const newIndex = questions.findIndex((q) => q.id === over.id);
      onReorder(oldIndex, newIndex);
    }
  };

  if (questions.length === 0) {
    return (
      <div className="text-center py-4" style={{ color: 'var(--gray-400)', fontSize: '0.8rem' }}>
        <i className="bi bi-list-ul d-block mb-2 fs-4"></i>
        No questions yet
      </div>
    );
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={questions.map((q) => q.id)} strategy={verticalListSortingStrategy}>
        <div className="d-flex flex-column gap-1">
          {questions.map((q, i) => {
            const showDivider = i === 0 || q.subject !== questions[i - 1].subject;
            return (
              <React.Fragment key={q.id}>
                {showDivider && q.subject && (
                  <div className="d-flex align-items-center mt-3 mb-1 gap-2">
                    <hr className="flex-grow-1 m-0 text-muted opacity-25" />
                    <span 
                      className="text-muted fw-bold text-uppercase" 
                      style={{ fontSize: '0.65rem', letterSpacing: '0.05em' }}
                    >
                      {q.subject}
                    </span>
                    <hr className="flex-grow-1 m-0 text-muted opacity-25" />
                  </div>
                )}
                <SortableQuestionRow
                  question={q}
                  isActive={q.qNumber === activeQNumber}
                  onClick={onSelect}
                  onDelete={onDelete}
                />
              </React.Fragment>
            );
          })}
        </div>
      </SortableContext>
    </DndContext>
  );
};
