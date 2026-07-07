import React, { useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { updateQuestionSet } from '../db/questionSetRepository';
import { parseDocx } from '../import/docxImporter';
import { parseXlsxOrCsv } from '../import/spreadsheetImporter';
import { applyTemplateOverrides } from '../import/applyTemplateOverrides';
import { ImportSummary } from '../components/import/ImportSummary';
import type { Question } from '../types';

type ParseState =
  | { stage: 'idle' }
  | { stage: 'parsing' }
  | { stage: 'preview'; questions: Question[]; parseErrors: { rawLineOrRow: string; message: string }[]; infoNotices: { qNumber: number; message: string }[] }
  | { stage: 'error'; message: string };

const ACCEPTED_TYPES = '.docx,.xlsx,.csv';

export const ImportPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const questionSet = useLiveQuery(() => db.questionSets.get(id!), [id]);
  const template = useLiveQuery(
    () => questionSet ? db.templates.get(questionSet.templateId) : undefined,
    [questionSet?.templateId]
  );

  const [parseState, setParseState] = useState<ParseState>({ stage: 'idle' });
  const [fileError, setFileError] = useState('');

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileError('');

    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!['docx', 'xlsx', 'csv'].includes(ext ?? '')) {
      setFileError(`Unsupported file type: ".${ext}". Please upload a .docx, .xlsx, or .csv file.`);
      e.target.value = '';
      return;
    }

    if (!questionSet || !template) {
      setFileError('Question set or template not loaded yet. Try again.');
      return;
    }

    setParseState({ stage: 'parsing' });

    try {
      let result;
      if (ext === 'docx') {
        result = await parseDocx(file, questionSet.id);
      } else {
        result = await parseXlsxOrCsv(file, questionSet.id);
      }

      const { questions: overridden, infoNotices } = applyTemplateOverrides(result.questions, template);

      setParseState({
        stage: 'preview',
        questions: overridden,
        parseErrors: result.parseErrors,
        infoNotices,
      });
    } catch (err) {
      setParseState({ stage: 'error', message: `Import failed: ${String(err)}` });
    }

    e.target.value = '';
  }, [questionSet, template]);

  const handleConfirm = useCallback(async () => {
    if (parseState.stage !== 'preview' || !questionSet) return;

    // Merge imported questions: replace existing by qNumber, append new
    const existingMap = new Map(questionSet.questions.map((q) => [q.qNumber, q]));
    for (const q of parseState.questions) {
      existingMap.set(q.qNumber, q);
    }
    const merged = Array.from(existingMap.values()).sort((a, b) => a.qNumber - b.qNumber);

    await updateQuestionSet({ ...questionSet, questions: merged });
    navigate(`/question-set/${questionSet.id}`);
  }, [parseState, questionSet, navigate]);

  const handleCancel = () => {
    setParseState({ stage: 'idle' });
  };

  if (questionSet === undefined || template === undefined) {
    return (
      <div className="container py-5 text-center">
        <div className="spinner-border text-secondary" role="status">
          <span className="visually-hidden">Loading…</span>
        </div>
      </div>
    );
  }

  if (!questionSet || !template) {
    return (
      <div className="container py-4">
        <div className="alert alert-warning">Question set or template not found.</div>
      </div>
    );
  }

  return (
    <div className="container py-4 max-w-680">
      <div className="page-header">
        <div className="d-flex align-items-center gap-3">
          <button type="button" className="btn-icon" onClick={() => navigate(`/question-set/${questionSet.id}`)}>
            <i className="bi bi-arrow-left"></i>
          </button>
          <div>
            <h1 className="mb-0">Import Questions</h1>
            <p className="text-muted small mb-0 mt-1">
              {questionSet.title} · {template.name}
            </p>
          </div>
        </div>
      </div>

      {parseState.stage === 'idle' && (
        <div className="card p-4">
          <div className="mb-3">
            <label className="form-label fw-600">Upload File</label>
            <p className="text-muted small mb-3">
              Supported formats: <strong>.docx</strong> (with <code>{'{QUESTION BEGINS}'}</code> blocks),{' '}
              <strong>.xlsx</strong>, or <strong>.csv</strong> (matching the reference table columns).
            </p>
            <input
              id="import-file-input"
              type="file"
              accept={ACCEPTED_TYPES}
              className="form-control"
              onChange={handleFileChange}
            />
            {fileError && (
              <div className="text-danger small mt-2">
                <i className="bi bi-exclamation-triangle me-1"></i>{fileError}
              </div>
            )}
          </div>
        </div>
      )}

      {parseState.stage === 'parsing' && (
        <div className="card p-4 text-center">
          <div className="spinner-border text-secondary mb-3" role="status"></div>
          <div className="text-muted">Parsing file…</div>
        </div>
      )}

      {parseState.stage === 'preview' && (
        <ImportSummary
          questionCount={parseState.questions.length}
          parseErrors={parseState.parseErrors}
          infoNotices={parseState.infoNotices}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
        />
      )}

      {parseState.stage === 'error' && (
        <div className="card p-4">
          <div className="alert alert-danger mb-3">
            <i className="bi bi-exclamation-triangle-fill me-2"></i>{parseState.message}
          </div>
          <button type="button" className="btn-icon" onClick={handleCancel}>
            Try Again
          </button>
        </div>
      )}
    </div>
  );
};
