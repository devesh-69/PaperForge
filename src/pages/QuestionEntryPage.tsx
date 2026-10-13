import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useNavigate, useBlocker } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { Modal, Button } from 'react-bootstrap';
import toast from 'react-hot-toast';
import { db } from '../db/db';
import { updateQuestionSet } from '../db/questionSetRepository';
import { QuestionForm } from '../components/richTextEntry/QuestionForm';
import { QuestionSidebarList } from '../components/richTextEntry/QuestionSidebarList';
import { exportQuestionSet } from '../export/exportQuestionSet';
import { validateQuestionSet } from '../validation/validateQuestionSet';
import { ErrorReportPanel } from '../components/validation/ErrorReportPanel';
import { InfoNoticeList } from '../components/validation/InfoNoticeList';
import { QuestionGrid } from '../components/bulkGrid/QuestionGrid';
import { applyTemplateLocks } from '../utils/resolveLockedFields';
import type { QuestionSet, Question, Template } from '../types';

const UNSAVED_MESSAGE = 'You have unsaved changes on this question. Discard them?';

// ── Shown when the set's template has been deleted ──────────────────────────
const MissingTemplatePanel: React.FC<{ questionSet: QuestionSet }> = ({ questionSet }) => {
  const navigate = useNavigate();
  const templates = useLiveQuery(() => db.templates.orderBy('name').toArray());
  const [targetId, setTargetId] = useState('');
  const [busy, setBusy] = useState(false);

  const relink = async () => {
    if (!targetId) return;
    setBusy(true);
    try {
      await updateQuestionSet({ ...questionSet, templateId: targetId });
      toast.success('Template re-linked');
    } finally {
      setBusy(false);
    }
  };

  const exportAnyway = async () => {
    setBusy(true);
    try {
      const outcome = await exportQuestionSet(questionSet, null);
      if (outcome.ok) toast.success('Export successful');
      else {
        const n = Object.values(outcome.validation.errorsByQuestion).flat().length;
        toast.error(`${n} validation error${n !== 1 ? 's' : ''} — re-link a template and fix them before exporting`);
      }
    } catch (err) {
      console.error('Export error', err);
      toast.error('Export failed. Check console for details.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="container py-5 text-center mt-5">
      <div className="card p-5 max-w-600 mx-auto border-0 shadow-sm">
        <i className="bi bi-exclamation-triangle text-danger mb-3" style={{ fontSize: '3rem' }}></i>
        <h3 className="text-danger">Template Missing</h3>
        <p className="text-muted">
          The template for <strong>{questionSet.title}</strong> has been deleted.
          Your {questionSet.questions.length} question{questionSet.questions.length !== 1 ? 's are' : ' is'} safe —
          re-link the set to another template to keep editing, or export it as it is.
        </p>
        <div className="d-flex gap-2 justify-content-center mb-3">
          <select
            className="form-select"
            style={{ maxWidth: 280 }}
            value={targetId}
            onChange={(e) => setTargetId(e.target.value)}
          >
            <option value="">— Choose a template —</option>
            {(templates ?? []).map((t: Template) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
          <button className="btn-orange" onClick={relink} disabled={!targetId || busy}>Re-link</button>
        </div>
        <div className="d-flex gap-2 justify-content-center">
          <button className="btn-outline-black" onClick={exportAnyway} disabled={busy || questionSet.questions.length === 0}>
            <i className="bi bi-download me-1"></i> Export .docx
          </button>
          <button className="btn-dark" onClick={() => navigate('/question-sets')}>
            Return to My Question Sets
          </button>
        </div>
      </div>
    </div>
  );
};

export const QuestionEntryPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // `undefined` = still loading, `null` = loaded but does not exist
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
    [questionSet?.templateId, questionSet === undefined, questionSet === null]
  );

  const [activeQNumber, setActiveQNumber] = useState(1);
  const [entryMode, setEntryMode] = useState<'single' | 'bulk'>('single');
  const [exporting, setExporting] = useState(false);
  const [showErrorPanel, setShowErrorPanel] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);
  // Bumped to force the form to reload when its unsaved edits were knowingly discarded
  const [formKey, setFormKey] = useState(0);

  // Unsaved-edit tracking for the single-question form
  const dirtyRef = useRef(false);
  const handleDirtyChange = useCallback((d: boolean) => {
    dirtyRef.current = d;
  }, []);

  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (dirtyRef.current) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, []);

  // Leaving this page (navbar, links, back button) with unsaved edits asks first.
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      dirtyRef.current && currentLocation.pathname !== nextLocation.pathname
  );
  useEffect(() => {
    if (blocker.state !== 'blocked') return;
    if (window.confirm(UNSAVED_MESSAGE)) blocker.proceed();
    else blocker.reset();
  }, [blocker]);

  const errorPanelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (showErrorPanel) errorPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [showErrorPanel]);

  /** For plain navigation: the form reloads itself once the number changes. */
  const confirmDiscard = useCallback(() => !dirtyRef.current || window.confirm(UNSAVED_MESSAGE), []);

  /** For data-changing actions: also resets the form so it cannot keep stale edits. */
  const confirmDiscardAndReset = useCallback(() => {
    if (!dirtyRef.current) return true;
    if (!window.confirm(UNSAVED_MESSAGE)) return false;
    dirtyRef.current = false;
    setFormKey((k) => k + 1);
    return true;
  }, []);

  // Locked fields always follow the template, so stale values (e.g. after the
  // template was edited) never reach the form, grid, validation or export.
  const effectiveSet = useMemo<QuestionSet | null>(() => {
    if (!questionSet || !template) return null;
    return { ...questionSet, questions: questionSet.questions.map((q) => applyTemplateLocks(q, template)) };
  }, [questionSet, template]);

  const sortedQuestions = useMemo(
    () => (effectiveSet ? effectiveSet.questions.slice().sort((a, b) => a.qNumber - b.qNumber) : []),
    [effectiveSet]
  );

  const validationResult = useMemo(() => {
    if (!effectiveSet || !template) return null;
    return validateQuestionSet(effectiveSet.questions, template);
  }, [effectiveSet, template]);

  const hasErrors = validationResult !== null && !validationResult.isValid;

  const handleSave = useCallback(async (updatedSet: QuestionSet) => {
    await updateQuestionSet(updatedSet);
  }, []);

  const handleGridChange = useCallback(async (updatedQuestions: Question[]) => {
    if (!effectiveSet) return;
    await updateQuestionSet({ ...effectiveSet, questions: updatedQuestions });
  }, [effectiveSet]);

  const handleReorder = useCallback(async (oldIndex: number, newIndex: number) => {
    if (!effectiveSet || !template) return;
    if (oldIndex < 0 || newIndex < 0 || oldIndex >= sortedQuestions.length || newIndex >= sortedQuestions.length) return;
    if (!confirmDiscardAndReset()) return;

    const activeId = sortedQuestions.find((q) => q.qNumber === activeQNumber)?.id;

    const reordered = sortedQuestions.slice();
    const [moved] = reordered.splice(oldIndex, 1);
    reordered.splice(newIndex, 0, moved);

    // renumber 1..n and re-apply the template rules for each question's new position
    const renumbered = reordered.map((q, idx) => applyTemplateLocks({ ...q, qNumber: idx + 1 }, template));

    await updateQuestionSet({ ...effectiveSet, questions: renumbered });

    // follow the question the user was on
    const activeNow = renumbered.find((q) => q.id === activeId);
    if (activeNow) setActiveQNumber(activeNow.qNumber);
  }, [effectiveSet, template, sortedQuestions, activeQNumber, confirmDiscardAndReset]);

  const handleDeleteClick = useCallback((qNumber: number) => {
    setDeleteTarget(qNumber);
  }, []);

  const handleConfirmDelete = async () => {
    if (deleteTarget === null || !effectiveSet || !template) return;
    if (!confirmDiscardAndReset()) return;
    setDeleting(true);
    try {
      const qNumber = deleteTarget;
      // later questions shift down by one, so they must also pick up the rules of their new position
      const remaining = sortedQuestions
        .filter((q) => q.qNumber !== qNumber)
        .map((q, idx) => applyTemplateLocks({ ...q, qNumber: idx + 1 }, template));
      await updateQuestionSet({ ...effectiveSet, questions: remaining });
      if (activeQNumber === qNumber) {
        setActiveQNumber(Math.max(1, qNumber - 1));
      } else if (activeQNumber > qNumber) {
        setActiveQNumber(activeQNumber - 1);
      }
      toast.success(`Question ${qNumber} deleted`);
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  const handleNavigateToQuestion = useCallback((qNumber: number) => {
    if (qNumber !== activeQNumber || entryMode !== 'single') {
      if (!confirmDiscard()) return;
    }
    setEntryMode('single');
    setActiveQNumber(qNumber);
    setTimeout(() => {
      document.querySelector('.editor-main-content')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  }, [activeQNumber, entryMode, confirmDiscard]);

  const handleSwitchMode = (mode: 'single' | 'bulk') => {
    if (mode === entryMode) return;
    if (!confirmDiscard()) return;
    setEntryMode(mode);
  };

  // the router blocker above asks about unsaved edits
  const leaveTo = (path: string) => navigate(path);

  const handleAddQuestion = () => {
    const used = new Set(sortedQuestions.map((q) => q.qNumber));
    let n = 1;
    while (used.has(n)) n++;
    const max = template?.maxQuestions ?? null;
    if (max !== null && n > max) {
      toast.error(`This template allows at most ${max} questions.`);
      return;
    }
    handleNavigateToQuestion(n);
  };

  const errorQNumbers = useMemo(
    () => new Set(Object.keys(validationResult?.errorsByQuestion ?? {}).map(Number)),
    [validationResult]
  );

  const handleExport = useCallback(async () => {
    if (!questionSet || !template) return;

    setExporting(true);
    try {
      const outcome = await exportQuestionSet(questionSet, template);
      if (outcome.ok) {
        toast.success('Export successful');
      } else {
        setShowErrorPanel(true);
      }
    } catch (err) {
      console.error('Export error', err);
      toast.error('Export failed. Check console for details.');
    } finally {
      setExporting(false);
    }
  }, [questionSet, template]);

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

  if (template === null || !effectiveSet) {
    return <MissingTemplatePanel questionSet={questionSet} />;
  }

  const questions = sortedQuestions;

  return (
    <div className="container-fluid py-0 max-w-1600">
      <div className="d-flex min-h-content">
        {/* ── Sidebar ─── */}
        {entryMode === 'single' && (
          <aside className="editor-sidebar">
            <div className="mb-3">
              <button type="button" className="btn-icon mb-3" onClick={() => leaveTo('/question-sets')}>
                <i className="bi bi-arrow-left"></i> My Question Sets
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

            <button type="button" className="btn-icon w-100 mb-2 justify-content-center" onClick={handleAddQuestion}>
              <i className="bi bi-plus-lg"></i> Add question
            </button>

            <QuestionSidebarList
              errorQNumbers={errorQNumbers}
              questions={questions}
              activeQNumber={activeQNumber}
              onSelect={handleNavigateToQuestion}
              onDelete={handleDeleteClick}
              onReorder={handleReorder}
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
                <button type="button" className="btn-icon" onClick={() => leaveTo('/question-sets')} title="Back to My Question Sets">
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
                  onClick={() => handleSwitchMode('single')}
                >
                  <i className="bi bi-file-earmark-text me-1"></i> Single View
                </button>
                <button
                  type="button"
                  className={`btn ${entryMode === 'bulk' ? 'btn-dark' : 'btn-outline-dark'}`}
                  onClick={() => handleSwitchMode('bulk')}
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
                onClick={() => leaveTo(`/question-set/${questionSet.id}/import`)}
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
            <div ref={errorPanelRef}>
              <ErrorReportPanel
                errorsByQuestion={validationResult.errorsByQuestion}
                onNavigateToQuestion={handleNavigateToQuestion}
                onDismiss={() => setShowErrorPanel(false)}
              />
            </div>
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
              key={formKey}
              template={template}
              questionSet={effectiveSet}
              initialQNumber={activeQNumber}
              onSave={handleSave}
              onNavigateToQuestion={setActiveQNumber}
              onDelete={handleDeleteClick}
              onDirtyChange={handleDirtyChange}
            />
          ) : (
            <QuestionGrid
              template={template}
              questions={effectiveSet.questions}
              onChange={handleGridChange}
              questionSetId={questionSet.id}
            />
          )}
        </main>
      </div>

      {/* ── Delete Confirmation Modal ───────────────────────────── */}
      <Modal show={deleteTarget !== null} onHide={() => setDeleteTarget(null)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Delete Question</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p className="mb-1">
            Are you sure you want to delete Question{' '}
            <strong>{deleteTarget}</strong>?
          </p>
          <p className="text-muted small mb-0">
            This action cannot be undone. All subsequent questions will be renumbered.
          </p>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="light" onClick={() => setDeleteTarget(null)} disabled={deleting}>
            Cancel
          </Button>
          <Button
            style={{ background: '#ef4444', borderColor: '#ef4444', fontWeight: 600 }}
            onClick={handleConfirmDelete}
            disabled={deleting}
          >
            {deleting ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                Deleting...
              </>
            ) : (
              'Delete'
            )}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};
