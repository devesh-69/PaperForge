import React, { useCallback, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { saveAs } from 'file-saver';
import toast from 'react-hot-toast';
import { db } from '../db/db';
import { updateQuestionSet } from '../db/questionSetRepository';
import { QuestionForm } from '../components/richTextEntry/QuestionForm';
import { QuestionSidebarList } from '../components/richTextEntry/QuestionSidebarList';
import { generateDocx, getDocxFilename } from '../export/docxExporter';
import { validateQuestionSet } from '../validation/validateQuestionSet';
import { ErrorReportPanel } from '../components/validation/ErrorReportPanel';
import { InfoNoticeList } from '../components/validation/InfoNoticeList';
import { QuestionGrid } from '../components/bulkGrid/QuestionGrid';
import { findBlock } from '../utils/resolveLockedFields';
import type { QuestionSet, Question } from '../types';

export const QuestionEntryPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const questionSet = useLiveQuery(async () => {
    const qs = await db.questionSets.get(id!);
    return qs || null;
  }, [id]);

  const template = useLiveQuery(
    async () => {
      if (questionSet === undefined) return undefined;
      if (questionSet === null) return null;
      const t = await db.templates.get(questionSet.templateId);
      return t || null;
    },
    [questionSet]
  );

  const [activeQNumber, setActiveQNumber] = useState(1);
  const [entryMode, setEntryMode] = useState<'single' | 'bulk'>('single');
  const [exporting, setExporting] = useState(false);
  const [showErrorPanel, setShowErrorPanel] = useState(false);

  const validationResult = useMemo(() => {
    if (!questionSet || !template) return null;
    return validateQuestionSet(questionSet.questions, template);
  }, [questionSet, template]);

  const hasErrors = validationResult !== null && !validationResult.isValid;

  const handleSave = useCallback(async (updatedSet: QuestionSet) => {
    await updateQuestionSet(updatedSet);
  }, []);

  const handleGridChange = useCallback(async (updatedQuestions: Question[]) => {
    if (!questionSet) return;
    const updatedSet = { ...questionSet, questions: updatedQuestions };
    await updateQuestionSet(updatedSet);
  }, [questionSet]);

  const handleReorder = useCallback(async (oldIndex: number, newIndex: number) => {
    if (!questionSet) return;
    const sorted = questionSet.questions.slice().sort((a, b) => a.qNumber - b.qNumber);
    
    const [moved] = sorted.splice(oldIndex, 1);
    sorted.splice(newIndex, 0, moved);

    const renumbered = sorted.map((q, idx) => {
      const qNumber = idx + 1;
      const block = findBlock(template!, qNumber);
      if (!block) return { ...q, qNumber };
      return {
        ...q,
        qNumber,
        subject: block.subject,
        topic: block.topic !== undefined && block.topic !== '' ? block.topic : q.topic,
        questionType: block.questionType !== undefined ? block.questionType : q.questionType,
        correctMarks: block.correctMarks !== undefined ? block.correctMarks : q.correctMarks,
        negativeMarks: block.negativeMarks !== undefined ? block.negativeMarks : q.negativeMarks,
        difficulty: block.difficulty !== undefined ? block.difficulty : q.difficulty,
        tags: block.tags !== undefined && block.tags.length > 0 ? block.tags : q.tags,
      };
    });

    // Keep activeQNumber in sync if the active question moved or shifted
    if (activeQNumber === oldIndex + 1) {
      setActiveQNumber(newIndex + 1);
    } else if (activeQNumber > oldIndex + 1 && activeQNumber <= newIndex + 1) {
      setActiveQNumber(activeQNumber - 1);
    } else if (activeQNumber < oldIndex + 1 && activeQNumber >= newIndex + 1) {
      setActiveQNumber(activeQNumber + 1);
    }

    const updatedSet = { ...questionSet, questions: renumbered };
    await updateQuestionSet(updatedSet);
  }, [questionSet, activeQNumber]);

  const handleDeleteQuestion = useCallback(async (qNumber: number) => {
    if (!window.confirm(`Are you sure you want to delete Question ${qNumber}?`)) return;
    if (!questionSet) return;
    // Remove the question and renumber the rest sequentially
    const remaining = questionSet.questions
      .filter((q) => q.qNumber !== qNumber)
      .sort((a, b) => a.qNumber - b.qNumber)
      .map((q, idx) => ({ ...q, qNumber: idx + 1 }));
    const updatedSet = { ...questionSet, questions: remaining };
    await updateQuestionSet(updatedSet);
    // If the deleted question was active, move to previous or first
    if (activeQNumber === qNumber) {
      setActiveQNumber(Math.max(1, qNumber - 1));
    } else if (activeQNumber > qNumber) {
      setActiveQNumber(activeQNumber - 1);
    }
  }, [questionSet, activeQNumber]);

  const handleNavigateToQuestion = useCallback((qNumber: number) => {
    setEntryMode('single');
    setActiveQNumber(qNumber);
    setTimeout(() => {
      const formEl = document.querySelector('form');
      if (formEl) {
        formEl.scrollIntoView({ behavior: 'smooth' });
      }
    }, 50);
  }, []);

  const handleExport = useCallback(async () => {
    if (!questionSet || !template) return;

    if (hasErrors) {
      setShowErrorPanel(true);
      return;
    }

    setExporting(true);
    try {
      const blob = await generateDocx(questionSet, template);
      const filename = getDocxFilename(questionSet);
      saveAs(blob, filename);
      await updateQuestionSet({ ...questionSet, lastGeneratedAt: new Date().toISOString() });
      toast.success('Export successful');
    } catch (err) {
      console.error('Export error', err);
      toast.error('Export failed. Check console for details.');
    } finally {
      setExporting(false);
    }
  }, [questionSet, template, hasErrors]);



  if (questionSet === undefined || template === undefined) {
    return (
      <div className="container py-5 text-center mt-5">
        <div className="spinner-border text-secondary" role="status" style={{ width: '3rem', height: '3rem' }}>
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  if (questionSet === null) {
    return (
      <div className="container py-5 text-center mt-5">
        <h3 className="text-danger">Question Set Not Found</h3>
        <p className="text-muted">The question set you are trying to open does not exist or has been deleted.</p>
        <button className="btn-dark mt-3" onClick={() => navigate('/question-sets')}>Go to My Question Sets</button>
      </div>
    );
  }

  if (template === null) {
    return (
      <div className="container py-5 text-center mt-5">
        <div className="card p-5 max-w-600 mx-auto border-0 shadow-sm">
          <i className="bi bi-exclamation-triangle text-danger mb-3" style={{ fontSize: '3rem' }}></i>
          <h3 className="text-danger">Template Missing</h3>
          <p className="text-muted">
            The template associated with this question set has been deleted. <br />
            You cannot edit or export this question set without its template.
          </p>
          <button className="btn-dark mt-3 mx-auto" onClick={() => navigate('/question-sets')}>
            Return to My Question Sets
          </button>
        </div>
      </div>
    );
  }

  const questions = questionSet.questions.slice().sort((a, b) => a.qNumber - b.qNumber);

  return (
    <div className="container-fluid py-0 max-w-1600">
      <div className="d-flex min-h-content">
        {/* ── Sidebar ─── */}
        {entryMode === 'single' && (
          <aside className="editor-sidebar">
            <div className="mb-3">
              <button type="button" className="btn-icon mb-3" onClick={() => navigate('/')}>
                <i className="bi bi-arrow-left"></i> Templates
              </button>
              <div className="fw-700 ls-tight" style={{ fontSize: '0.9rem', lineHeight: 1.3 }}>
                {questionSet.title}
              </div>
              <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                {template.name}
              </div>
            </div>

            <div
              className="d-flex align-items-center justify-content-between mb-2"
              style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '0.05em' }}
            >
              <span>Questions</span>
              <span>{questions.length}</span>
            </div>

            <QuestionSidebarList
              questions={questions}
              activeQNumber={activeQNumber}
              onSelect={setActiveQNumber}
              onReorder={handleReorder}
              onDelete={handleDeleteQuestion}
            />
          </aside>
        )}

        {/* ── Main form area ───────────────────────────── */}
        <main className="editor-main-content">
          {/* Top toolbar */}
          <div
            className="d-flex justify-content-between align-items-center mb-4 pb-3"
            style={{ borderBottom: '1px solid var(--border)' }}
          >
            <div className="d-flex align-items-center gap-3">
              {entryMode === 'bulk' && (
                <button type="button" className="btn-icon" onClick={() => navigate('/')} title="Back">
                  <i className="bi bi-arrow-left"></i>
                </button>
              )}
              <div>
                <span className="fw-700" style={{ fontSize: '1.05rem' }}>
                  {entryMode === 'bulk' ? `Grid Editor: ${questionSet.title}` : 'Question Entry'}
                </span>
                {template.maxQuestions && (
                  <span className="ms-2 text-muted small">
                    ({questions.length} / {template.maxQuestions})
                  </span>
                )}
              </div>

              {/* View Switcher Toggle */}
              <div className="btn-group btn-group-sm ms-3">
                <button
                  type="button"
                  className={`btn ${entryMode === 'single' ? 'btn-dark' : 'btn-outline-dark'}`}
                  onClick={() => setEntryMode('single')}
                >
                  <i className="bi bi-file-earmark-text me-1"></i> Single View
                </button>
                <button
                  type="button"
                  className={`btn ${entryMode === 'bulk' ? 'btn-dark' : 'btn-outline-dark'}`}
                  onClick={() => setEntryMode('bulk')}
                >
                  <i className="bi bi-grid-3x3 me-1"></i> Grid Editor
                </button>
              </div>
            </div>

            <div className="d-flex gap-2 align-items-center">
              {hasErrors && validationResult && (
                <span className="badge-tag" style={{ background: '#fee2e2', color: '#991b1b', fontSize: '0.75rem' }}>
                  <i className="bi bi-exclamation-triangle-fill me-1"></i>
                  {Object.values(validationResult.errorsByQuestion).flat().length} errors
                </span>
              )}
              <button
                type="button"
                className="btn-icon"
                onClick={() => navigate(`/question-set/${questionSet.id}/import`)}
                title="Import questions from file"
              >
                <i className="bi bi-upload me-1"></i> Import
              </button>
              <button
                type="button"
                className="btn-orange"
                onClick={handleExport}
                disabled={questions.length === 0 || exporting}
                title={
                  questions.length === 0
                    ? 'Add at least one question to export'
                    : hasErrors
                    ? 'Fix validation errors before exporting'
                    : 'Export as .docx'
                }
              >
                {exporting ? (
                  <><span className="spinner-border spinner-border-sm me-1" role="status"></span>Exporting…</>
                ) : (
                  <><i className="bi bi-download"></i> Export .docx</>
                )}
              </button>
            </div>
          </div>

          {/* Validation error panel */}
          {showErrorPanel && validationResult && (
            <ErrorReportPanel
              errorsByQuestion={validationResult.errorsByQuestion}
              onNavigateToQuestion={handleNavigateToQuestion}
              onDismiss={() => setShowErrorPanel(false)}
            />
          )}

          {/* Info notices */}
          {validationResult && validationResult.infoNotices.length > 0 && (
            <InfoNoticeList
              notices={validationResult.infoNotices}
              onNavigateToQuestion={handleNavigateToQuestion}
            />
          )}

          {entryMode === 'single' ? (
            <QuestionForm
              template={template}
              questionSet={questionSet}
              initialQNumber={activeQNumber}
              onSave={async (updatedSet) => {
                await handleSave(updatedSet);
              }}
              onNavigateToQuestion={setActiveQNumber}
              onDelete={handleDeleteQuestion}
            />
          ) : (
            <QuestionGrid
              template={template}
              questions={questionSet.questions}
              onChange={handleGridChange}
              questionSetId={questionSet.id}
            />
          )}
        </main>
      </div>
    </div>
  );
};
