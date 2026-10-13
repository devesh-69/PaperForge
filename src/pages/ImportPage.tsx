import React, { useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { updateQuestionSet } from '../db/questionSetRepository';
import { parseDocx } from '../import/docxImporter';
import { parseXlsxOrCsv } from '../import/spreadsheetImporter';
import { applyTemplateOverrides } from '../import/applyTemplateOverrides';
import { downloadSampleDocx, downloadSampleCsv } from '../import/samples';
import { ImportSummary } from '../components/import/ImportSummary';
import type { Question } from '../types';

type Notice = { qNumber: number; message: string };

type ParseState =
  | { stage: 'idle' }
  | { stage: 'parsing' }
  | {
      stage: 'preview';
      questions: Question[];
      parseErrors: { rawLineOrRow: string; message: string }[];
      infoNotices: Notice[];
      replaceCount: number;
    }
  | { stage: 'error'; message: string };

const ACCEPTED_TYPES = '.docx,.xlsx,.csv';
const MAX_FILE_BYTES = 10 * 1024 * 1024;

export const ImportPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // `undefined` = still loading, `null` = loaded but does not exist
  const questionSet = useLiveQuery(async () => (await db.questionSets.get(id!)) ?? null, [id]);
  const template = useLiveQuery(
    async () => {
      if (questionSet === undefined) return undefined;
      if (questionSet === null) return null;
      return (await db.templates.get(questionSet.templateId)) ?? null;
    },
    [questionSet?.templateId, questionSet === null, questionSet === undefined]
  );

  const [parseState, setParseState] = useState<ParseState>({ stage: 'idle' });
  const [fileError, setFileError] = useState('');

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target;
    const file = input.files?.[0];
    if (!file) return;
    setFileError('');

    try {
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (!['docx', 'xlsx', 'csv'].includes(ext ?? '')) {
        setFileError(`Unsupported file type: ".${ext}". Please upload a .docx, .xlsx, or .csv file.`);
        return;
      }
      if (file.size > MAX_FILE_BYTES) {
        setFileError(`File is too large (${(file.size / 1024 / 1024).toFixed(1)} MB). The limit is ${MAX_FILE_BYTES / 1024 / 1024} MB.`);
        return;
      }
      if (!questionSet || !template) {
        setFileError('Question set or template not loaded yet. Try again.');
        return;
      }

      setParseState({ stage: 'parsing' });

      try {
        const result = ext === 'docx'
          ? await parseDocx(file, questionSet.id)
          : await parseXlsxOrCsv(file, questionSet.id);

        // Later rows win when a file repeats a question number
        const byNumber = new Map<number, Question>();
        const duplicates = new Set<number>();
        for (const q of result.questions) {
          if (byNumber.has(q.qNumber)) duplicates.add(q.qNumber);
          byNumber.set(q.qNumber, q);
        }
        const unique = Array.from(byNumber.values()).sort((a, b) => a.qNumber - b.qNumber);

        const { questions: overridden, infoNotices } = applyTemplateOverrides(unique, template);

        const notices: Notice[] = [
          ...result.warnings,
          ...Array.from(duplicates).map((n) => ({
            qNumber: n,
            message: `Q${n} appears more than once in the file — the last occurrence was used`,
          })),
          ...infoNotices,
        ];
        const existing = new Set(questionSet.questions.map((q) => q.qNumber));

        setParseState({
          stage: 'preview',
          questions: overridden,
          parseErrors: result.parseErrors,
          infoNotices: notices,
          replaceCount: overridden.filter((q) => existing.has(q.qNumber)).length,
        });
      } catch (err) {
        setParseState({ stage: 'error', message: `Import failed: ${String(err)}` });
      }
    } finally {
      input.value = '';
    }
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
        <div className="alert alert-warning">
          {!questionSet
            ? 'Question set not found. It may have been deleted.'
            : 'The template for this question set no longer exists, so questions cannot be imported.'}
        </div>
        <button type="button" className="btn-icon" onClick={() => navigate('/question-sets')}>
          <i className="bi bi-arrow-left me-1"></i> My Question Sets
        </button>
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
              Blank marks default to 1 (correct) and 0 (negative); negative marks are always saved as a deduction.
              Max {MAX_FILE_BYTES / 1024 / 1024} MB.
            </p>
            <div className="d-flex gap-2 flex-wrap mb-3">
              <button type="button" className="btn-icon" onClick={() => void downloadSampleDocx()}>
                <i className="bi bi-file-earmark-word me-1"></i> Download sample .docx
              </button>
              <button type="button" className="btn-icon" onClick={downloadSampleCsv}>
                <i className="bi bi-filetype-csv me-1"></i> Download sample .csv
              </button>
            </div>
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
          replaceCount={parseState.replaceCount}
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
