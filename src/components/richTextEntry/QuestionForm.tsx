import React, { useState, useEffect, useCallback } from 'react';
import type {
  Template,
  Question,
  QuestionSet,
  SubjectBlock,
  QuestionType,
  Difficulty,
  RichContent,
} from '../../types';
import { QUESTION_TYPES, DIFFICULTIES } from '../../types';
import { RichTextField } from './RichTextField';
import { RightAnswerInput } from './RightAnswerInput';
import {
  findBlock,
  isFieldLocked,
  buildEmptyQuestion,
  getOptionsCount,
} from '../../utils/resolveLockedFields';
import { TagInput } from '../templateBuilder/TagInput';

// ── Component ─────────────────────────────────────────────────────────────

interface Props {
  template: Template;
  questionSet: QuestionSet;
  initialQNumber: number;
  onSave: (updatedSet: QuestionSet) => Promise<void>;
  onNavigateToQuestion?: (qNumber: number) => void;
  onDelete?: (qNumber: number) => void;
}

export const QuestionForm: React.FC<Props> = ({
  template,
  questionSet,
  initialQNumber,
  onSave,
  onNavigateToQuestion,
  onDelete,
}) => {
  const [currentQ, setCurrentQ] = useState<Question>(() => {
    const existing = questionSet.questions.find((q) => q.qNumber === initialQNumber);
    return existing ?? buildEmptyQuestion(initialQNumber, template, questionSet.id);
  });

  const [saving, setSaving] = useState(false);
  const [savedNotice, setSavedNotice] = useState(false);

  const block = findBlock(template, currentQ.qNumber);
  const maxQ = template.maxQuestions;

  // When qNumber changes externally (sidebar click), reload question
  useEffect(() => {
    const existing = questionSet.questions.find((q) => q.qNumber === initialQNumber);
    setCurrentQ(existing ?? buildEmptyQuestion(initialQNumber, template, questionSet.id));
  }, [initialQNumber]); // eslint-disable-line react-hooks/exhaustive-deps

  // When question type changes, reset options and rightAnswer
  const handleTypeChange = useCallback((newType: QuestionType) => {
    setCurrentQ((prev) => {
      const optCount = getOptionsCount(newType);
      let opts = [...prev.options];
      if (newType === 'TRUE_OR_FALSE') {
        opts = [{ html: 'True', images: [] }, { html: 'False', images: [] }];
      } else if (optCount === 0) {
        opts = [];
      } else {
        while (opts.length < optCount) opts.push({ html: '', images: [] });
        opts = opts.slice(0, optCount);
      }
      return { ...prev, questionType: newType, options: opts };
    });
  }, []);

  const handleOptionChange = (idx: number, val: RichContent) => {
    setCurrentQ((prev) => {
      const opts = [...prev.options];
      opts[idx] = val;
      return { ...prev, options: opts };
    });
  };

  const addOption = () => {
    if (currentQ.options.length >= 10) return;
    setCurrentQ((prev) => ({ ...prev, options: [...prev.options, { html: '', images: [] }] }));
  };


  const removeOption = (idx: number) => {
    if (currentQ.options.length <= 2) return;
    setCurrentQ((prev) => {
      const opts = prev.options.filter((_, i) => i !== idx);
      return { ...prev, options: opts, rightAnswer: '' };
    });
  };

  const saveQuestion = async (andNext = false) => {
    setSaving(true);
    try {
      const updatedQuestions = questionSet.questions.some((q) => q.qNumber === currentQ.qNumber)
        ? questionSet.questions.map((q) => (q.qNumber === currentQ.qNumber ? currentQ : q))
        : [...questionSet.questions, currentQ].sort((a, b) => a.qNumber - b.qNumber);

      const updatedSet: QuestionSet = { ...questionSet, questions: updatedQuestions };
      await onSave(updatedSet);

      setSavedNotice(true);
      setTimeout(() => setSavedNotice(false), 1500);

      if (andNext) {
        const nextQNum = currentQ.qNumber + 1;
        if (maxQ !== null && nextQNum > maxQ) return;
        // Tell the parent to move to the next question number.
        // The parent controls activeQNumber so the live query re-render
        // doesn't reset the form back to the old question.
        if (onNavigateToQuestion) {
          onNavigateToQuestion(nextQNum);
        } else {
          const existing = updatedSet.questions.find((q) => q.qNumber === nextQNum);
          setCurrentQ(existing ?? buildEmptyQuestion(nextQNum, template, questionSet.id));
        }
      }
    } finally {
      setSaving(false);
    }
  };

  const isLocked = (field: keyof SubjectBlock) => {
    return isFieldLocked(block, field);
  };

  const atMaxQuestions = maxQ !== null && currentQ.qNumber >= maxQ;

  return (
    <div>
      {/* ── Q Number banner ─── */}
      <div
        className="d-flex align-items-center justify-content-between mb-4 px-4 py-3 rounded"
        style={{ background: 'var(--gray-50)', border: '1.5px solid var(--border)' }}
      >
        <div className="d-flex align-items-center gap-3">
          <div
            style={{
              width: 44, height: 44,
              background: 'var(--black)',
              color: 'var(--white)',
              borderRadius: 10,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 800, fontSize: '1.1rem',
            }}
          >
            Q{currentQ.qNumber}
          </div>
          <div>
            <div className="fw-700">{block?.subject ?? 'No block'}</div>
            <div className="text-muted small">{block ? `Block Q${block.startQ}–Q${block.endQ}` : 'Not in any block range'}</div>
          </div>
        </div>
        <div className="d-flex align-items-center gap-2">
          {savedNotice && (
            <span className="badge-locked px-3 py-2">
              <i className="bi bi-check2-circle me-1"></i>Saved
            </span>
          )}
          {onDelete && questionSet.questions.some((q) => q.qNumber === currentQ.qNumber) && (
            <button
              type="button"
              className="btn-icon danger"
              onClick={() => onDelete(currentQ.qNumber)}
              title={`Delete Q${currentQ.qNumber}`}
            >
              <i className="bi bi-trash"></i>
            </button>
          )}
        </div>
      </div>

      {/* ── Metadata row ─── */}
      <div className="row g-3 mb-4">
        {/* Subject */}
        <div className="col-md-4">
          <label className="form-label d-flex align-items-center gap-1">
            Subject {isLocked('subject') && <i className="bi bi-lock-fill text-muted" style={{ fontSize: '0.7rem' }}></i>}
          </label>
          <input
            className="form-control"
            value={currentQ.subject}
            onChange={(e) => setCurrentQ((p) => ({ ...p, subject: e.target.value }))}
            disabled={isLocked('subject')}
            placeholder="Subject"
          />
        </div>

        {/* Topic */}
        <div className="col-md-4">
          <label className="form-label d-flex align-items-center gap-1">
            Topic {isLocked('topic') && <i className="bi bi-lock-fill text-muted" style={{ fontSize: '0.7rem' }}></i>}
          </label>
          <input
            className="form-control"
            value={currentQ.topic}
            onChange={(e) => setCurrentQ((p) => ({ ...p, topic: e.target.value }))}
            disabled={isLocked('topic')}
            placeholder="Topic (or leave blank for N/A)"
          />
        </div>

        {/* Tags */}
        <div className="col-md-4">
          <label className="form-label d-flex align-items-center gap-1">
            Tags {isLocked('tags') && <i className="bi bi-lock-fill text-muted" style={{ fontSize: '0.7rem' }}></i>}
          </label>
          {isLocked('tags') ? (
            <input
              className="form-control"
              value={currentQ.tags.join(', ')}
              disabled
              placeholder="Tags (locked)"
            />
          ) : (
            <TagInput
              tags={currentQ.tags}
              onChange={(newTags) => setCurrentQ((p) => ({ ...p, tags: newTags }))}
            />
          )}
        </div>

        {/* Question Type */}
        <div className="col-md-4">
          <label className="form-label d-flex align-items-center gap-1">
            Question Type {isLocked('questionType') && <i className="bi bi-lock-fill text-muted" style={{ fontSize: '0.7rem' }}></i>}
          </label>
          <select
            className="form-select"
            value={currentQ.questionType}
            onChange={(e) => handleTypeChange(e.target.value as QuestionType)}
            disabled={isLocked('questionType')}
          >
            {QUESTION_TYPES.map((qt) => (
              <option key={qt} value={qt}>{qt}</option>
            ))}
          </select>
        </div>

        {/* Correct Marks */}
        <div className="col-md-2">
          <label className="form-label d-flex align-items-center gap-1">
            Correct Marks {isLocked('correctMarks') && <i className="bi bi-lock-fill text-muted" style={{ fontSize: '0.7rem' }}></i>}
          </label>
          <input
            type="number"
            step="0.5"
            className="form-control"
            value={currentQ.correctMarks}
            onChange={(e) => setCurrentQ((p) => ({ ...p, correctMarks: e.target.value === '' ? ('' as any) : parseFloat(e.target.value) }))}
            disabled={isLocked('correctMarks')}
          />
        </div>

        {/* Negative Marks */}
        <div className="col-md-2">
          <label className="form-label d-flex align-items-center gap-1">
            Negative Marks {isLocked('negativeMarks') && <i className="bi bi-lock-fill text-muted" style={{ fontSize: '0.7rem' }}></i>}
          </label>
          <input
            type="number"
            step="0.5"
            className="form-control"
            value={currentQ.negativeMarks}
            onChange={(e) => setCurrentQ((p) => ({ ...p, negativeMarks: e.target.value === '' ? ('' as any) : parseFloat(e.target.value) }))}
            disabled={isLocked('negativeMarks')}
          />
        </div>

        {/* Difficulty */}
        <div className="col-md-4">
          <label className="form-label d-flex align-items-center gap-1">
            Difficulty {isLocked('difficulty') && <i className="bi bi-lock-fill text-muted" style={{ fontSize: '0.7rem' }}></i>}
          </label>
          <select
            className="form-select"
            value={currentQ.difficulty}
            onChange={(e) => setCurrentQ((p) => ({ ...p, difficulty: e.target.value as Difficulty }))}
            disabled={isLocked('difficulty')}
          >
            {DIFFICULTIES.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>
      </div>

      {/* ── Question Text ─── */}
      <div className="mb-3">
        <label className="form-label fw-700">Question Text</label>
        <RichTextField
          value={currentQ.questionText}
          onChange={(v) => setCurrentQ((p) => ({ ...p, questionText: v }))}
          placeholder="Enter question text here…"
        />
      </div>

      {/* ── Options ─── */}
      {currentQ.questionType !== 'NUMERICAL' && currentQ.questionType !== 'FILLINTHEBLANK' && (
        <div className="mb-3">
          <div className="d-flex align-items-center justify-content-between mb-2">
            <label className="form-label fw-700 mb-0">Options</label>
            {currentQ.questionType !== 'TRUE_OR_FALSE' && (
              <div className="d-flex gap-2">
                {currentQ.options.length < 10 && (
                  <button type="button" className="btn-icon" onClick={addOption}>
                    <i className="bi bi-plus-lg"></i> Add Option
                  </button>
                )}
              </div>
            )}
          </div>
          {currentQ.options.map((opt, idx) => (
            <div key={idx} className="d-flex align-items-start gap-2 mb-2">
              <div
                style={{
                  width: 28, height: 28, minWidth: 28,
                  background: 'var(--gray-100)',
                  border: '1.5px solid var(--border)',
                  borderRadius: 6,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 700, fontSize: '0.78rem',
                  marginTop: 6,
                }}
              >
                {idx + 1}
              </div>
              <div style={{ flex: 1 }}>
                <RichTextField
                  value={opt}
                  onChange={(v) => handleOptionChange(idx, v)}
                  placeholder={`Option ${idx + 1}`}
                  disabled={currentQ.questionType === 'TRUE_OR_FALSE'}
                />
              </div>
              {currentQ.questionType !== 'TRUE_OR_FALSE' && currentQ.options.length > 2 && (
                <button
                  type="button"
                  className="btn-icon danger mt-1"
                  onClick={() => removeOption(idx)}
                  title="Remove option"
                >
                  <i className="bi bi-x-lg"></i>
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── Right Answer ─── */}
      <div className="mb-3">
        <RightAnswerInput
          questionType={currentQ.questionType}
          options={currentQ.options}
          value={currentQ.rightAnswer}
          onChange={(v) => setCurrentQ((p) => ({ ...p, rightAnswer: v }))}
        />
      </div>

      {/* ── Explanation ─── */}
      <div className="mb-4">
        <label className="form-label fw-700">Explanation</label>
        <RichTextField
          value={currentQ.explanation}
          onChange={(v) => setCurrentQ((p) => ({ ...p, explanation: v }))}
          placeholder="Enter explanation (optional)…"
        />
      </div>

      {/* ── Action buttons ─── */}
      <div className="d-flex gap-2 pt-3 border-top flex-wrap">
        <button
          type="button"
          className="btn-outline-black"
          onClick={() => saveQuestion(false)}
          disabled={saving}
        >
          {saving ? <span className="spinner-border spinner-border-sm me-1" role="status"></span> : <i className="bi bi-floppy"></i>}
          Save
        </button>
        <button
          type="button"
          className="btn-orange"
          onClick={() => saveQuestion(true)}
          disabled={saving || atMaxQuestions}
          title={atMaxQuestions ? `Max questions (${maxQ}) reached` : undefined}
        >
          <i className="bi bi-arrow-right-circle"></i>
          Save &amp; Next Question
        </button>
        {atMaxQuestions && (
          <span className="align-self-center text-muted small">
            <i className="bi bi-info-circle me-1"></i>
            Max questions reached ({maxQ})
          </span>
        )}
      </div>
    </div>
  );
};
