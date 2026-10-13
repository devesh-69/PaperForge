import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { validateQuestionSet } from '../../validation/validateQuestionSet';
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
  applyTemplateLocks,
  reconcileOptions,
  hasQuestionContent,
  questionsEqual,
  MAX_OPTIONS,
} from '../../utils/resolveLockedFields';
import { TagInput } from '../templateBuilder/TagInput';
import { toNegativeMarks, negativeMarksTooLarge } from '../../utils/marks';

// ── Component ─────────────────────────────────────────────────────────────

interface Props {
  template: Template;
  questionSet: QuestionSet;
  initialQNumber: number;
  onSave: (updatedSet: QuestionSet) => Promise<void>;
  onNavigateToQuestion?: (qNumber: number) => void;
  onDelete?: (qNumber: number) => void;
  /** Called whenever the form gains or loses unsaved edits. */
  onDirtyChange?: (dirty: boolean) => void;
}

const numberInputValue = (n: number): number | '' => (Number.isFinite(n) ? n : '');

export const QuestionForm: React.FC<Props> = ({
  template,
  questionSet,
  initialQNumber,
  onSave,
  onNavigateToQuestion,
  onDelete,
  onDirtyChange,
}) => {
  // Build the editable copy of a question; locked fields always follow the template.
  const buildFor = useCallback(
    (qNumber: number, existing: Question | undefined) =>
      applyTemplateLocks(existing ?? buildEmptyQuestion(qNumber, template, questionSet.id), template),
    [template, questionSet.id]
  );

  const existingQuestion = questionSet.questions.find((q) => q.qNumber === initialQNumber);

  const [currentQ, setCurrentQ] = useState<Question>(() => buildFor(initialQNumber, existingQuestion));
  // `baselineRef` is the last loaded/saved version; unsaved edits = content differs from it
  const baselineRef = useRef<Question>(currentQ);
  const currentRef = useRef<Question>(currentQ);
  currentRef.current = currentQ;
  const loadedNumberRef = useRef(initialQNumber);

  const [saving, setSaving] = useState(false);
  const [savedNotice, setSavedNotice] = useState(false);

  const block = findBlock(template, currentQ.qNumber);
  const maxQ = template.maxQuestions;
  const dirty = !questionsEqual(currentQ, baselineRef.current);
  const negativeTooLarge = negativeMarksTooLarge(currentQ.correctMarks, currentQ.negativeMarks);

  // What still blocks export for the *saved* version of this question
  const issues = useMemo(() => {
    if (!existingQuestion) return [];
    const errs = validateQuestionSet([applyTemplateLocks(existingQuestion, template)], template).errorsByQuestion;
    return (errs[existingQuestion.qNumber] ?? []).filter((e) => e.field !== 'qNumber');
  }, [existingQuestion, template]);

  // (Re)load when the question number changes, or when the stored copy changes
  // underneath us (delete / reorder / import) — but never over unsaved edits.
  useEffect(() => {
    const numberChanged = loadedNumberRef.current !== initialQNumber;
    if (!numberChanged && !questionsEqual(currentRef.current, baselineRef.current)) return;
    loadedNumberRef.current = initialQNumber;
    const fresh = buildFor(initialQNumber, existingQuestion);
    baselineRef.current = fresh;
    setCurrentQ(fresh);
  }, [initialQNumber, existingQuestion, buildFor]);

  useEffect(() => {
    onDirtyChange?.(!questionsEqual(currentQ, baselineRef.current));
  }, [currentQ, onDirtyChange]);

  useEffect(() => () => onDirtyChange?.(false), [onDirtyChange]);

  // When question type changes, make options fit the type and clear an answer that no longer applies
  const handleTypeChange = useCallback((newType: QuestionType) => {
    setCurrentQ((prev) => {
      const options = reconcileOptions(newType, prev.options, prev.questionType);
      const answerStillValid =
        prev.questionType === newType ||
        (prev.questionType === 'SINGLECORRECT' && newType === 'MULTICORRECT');
      return { ...prev, questionType: newType, options, rightAnswer: answerStillValid ? prev.rightAnswer : '' };
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
    setCurrentQ((prev) =>
      prev.options.length >= MAX_OPTIONS
        ? prev
        : { ...prev, options: [...prev.options, { html: '', images: [] }] }
    );
  };

  const removeOption = (idx: number) => {
    setCurrentQ((prev) => {
      if (prev.options.length <= 2) return prev;
      const removed = idx + 1;
      const shift = (n: number) => (n > removed ? n - 1 : n);
      let rightAnswer = prev.rightAnswer;
      if (prev.questionType === 'SINGLECORRECT') {
        const n = parseInt(rightAnswer, 10);
        rightAnswer = isNaN(n) || n === removed ? '' : String(shift(n));
      } else if (prev.questionType === 'MULTICORRECT') {
        rightAnswer = rightAnswer
          .split(',')
          .map((s) => parseInt(s.trim(), 10))
          .filter((n) => !isNaN(n) && n !== removed)
          .map(shift)
          .join(',');
      }
      return { ...prev, options: prev.options.filter((_, i) => i !== idx), rightAnswer };
    });
  };

  const saveQuestion = async (andNext = false) => {
    setSaving(true);
    try {
      const toSave = applyTemplateLocks(currentQ, template);
      let updatedQuestions = questionSet.questions;

      if (hasQuestionContent(toSave, template)) {
        updatedQuestions = questionSet.questions.some((q) => q.qNumber === toSave.qNumber)
          ? questionSet.questions.map((q) => (q.qNumber === toSave.qNumber ? toSave : q))
          : [...questionSet.questions, toSave].sort((a, b) => a.qNumber - b.qNumber);
      } else {
        // If it was already in the DB but they emptied it, remove it
        updatedQuestions = questionSet.questions.filter((q) => q.qNumber !== toSave.qNumber);
      }

      const updatedSet: QuestionSet = { ...questionSet, questions: updatedQuestions };
      await onSave(updatedSet);

      // Saved: this version is now the baseline, so nothing is "unsaved"
      // (unless the user kept typing while the save was in flight)
      if (questionsEqual(currentRef.current, currentQ)) {
        baselineRef.current = currentRef.current;
        onDirtyChange?.(false);
      }
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
          const fresh = buildFor(nextQNum, updatedSet.questions.find((q) => q.qNumber === nextQNum));
          loadedNumberRef.current = nextQNum;
          baselineRef.current = fresh;
          setCurrentQ(fresh);
        }
      }
    } finally {
      setSaving(false);
    }
  };

  // Ctrl/Cmd+S saves the current question
  const saveRef = useRef(saveQuestion);
  saveRef.current = saveQuestion;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        void saveRef.current(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

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
          {dirty && !savedNotice && (
            <span className="badge bg-warning-subtle text-warning-emphasis px-3 py-2">
              <i className="bi bi-pencil me-1"></i>Unsaved changes
            </span>
          )}
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

      {/* ── Issues with the saved version of this question ─── */}
      {issues.length > 0 && (
        <div className="alert alert-warning py-2 px-3 mb-4" role="alert" style={{ fontSize: '0.85rem' }}>
          <div className="fw-700 mb-1">
            <i className="bi bi-exclamation-triangle-fill me-2"></i>
            This question can't be exported yet:
          </div>
          <ul className="mb-0 ps-3">
            {issues.map((e, i) => (
              <li key={i}>{e.message}</li>
            ))}
          </ul>
        </div>
      )}

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
            step="any"
            min={0}
            className="form-control"
            value={numberInputValue(currentQ.correctMarks)}
            onChange={(e) => setCurrentQ((p) => ({ ...p, correctMarks: e.target.value === '' ? NaN : parseFloat(e.target.value) }))}
            disabled={isLocked('correctMarks')}
          />
        </div>

        {/* Negative Marks — typed as a positive number, saved as a deduction */}
        <div className="col-md-2">
          <label className="form-label d-flex align-items-center gap-1">
            Negative Marks {isLocked('negativeMarks') && <i className="bi bi-lock-fill text-muted" style={{ fontSize: '0.7rem' }}></i>}
          </label>
          <input
            type="number"
            step="any"
            className={`form-control ${negativeTooLarge ? 'is-invalid' : ''}`}
            value={numberInputValue(currentQ.negativeMarks)}
            onChange={(e) => setCurrentQ((p) => ({ ...p, negativeMarks: e.target.value === '' ? NaN : parseFloat(e.target.value) }))}
            onBlur={() => setCurrentQ((p) => {
              const n = toNegativeMarks(p.negativeMarks);
              return Object.is(n, p.negativeMarks) ? p : { ...p, negativeMarks: n };
            })}
            disabled={isLocked('negativeMarks')}
            title="Type the deduction as a positive number (e.g. 0.25). It is saved as a minus."
          />
          {negativeTooLarge ? (
            <div className="invalid-feedback d-block">{negativeTooLarge}</div>
          ) : (
            <div className="form-text" style={{ fontSize: '0.7rem' }}>Saved as a deduction (−)</div>
          )}
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
          key={`${currentQ.id}-text`}
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
                {currentQ.options.length < MAX_OPTIONS && (
                  <button type="button" className="btn-icon" onClick={addOption}>
                    <i className="bi bi-plus-lg"></i> Add Option
                  </button>
                )}
              </div>
            )}
          </div>
          {currentQ.options.map((opt, idx) => (
            <div key={`${currentQ.id}-opt-${idx}`} className="d-flex align-items-start gap-2 mb-2">
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
          key={`${currentQ.id}-explanation`}
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
        {!atMaxQuestions && (
          <button
            type="button"
            className="btn-orange"
            onClick={() => saveQuestion(true)}
            disabled={saving}
          >
            <i className="bi bi-arrow-right-circle"></i>
            Save &amp; Next Question
          </button>
        )}
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
