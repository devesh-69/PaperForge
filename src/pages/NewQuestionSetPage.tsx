import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../db/db';
import { createQuestionSet } from '../db/questionSetRepository';
import type { QuestionSet } from '../types';

export const NewQuestionSetPage: React.FC = () => {
  const navigate = useNavigate();
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [title, setTitle] = useState('');
  const [titleError, setTitleError] = useState('');
  const [templateError, setTemplateError] = useState('');
  const [creating, setCreating] = useState(false);

  const templates = useLiveQuery(() => db.templates.orderBy('name').toArray());

  const handleCreate = useCallback(async () => {
    let valid = true;
    if (!title.trim()) {
      setTitleError('Title is required.');
      valid = false;
    } else {
      setTitleError('');
    }
    if (!selectedTemplateId) {
      setTemplateError('Please select a template.');
      valid = false;
    } else {
      setTemplateError('');
    }
    if (!valid) return;

    setCreating(true);
    try {
      const now = new Date().toISOString();
      const qs: QuestionSet = {
        id: uuidv4(),
        templateId: selectedTemplateId,
        title: title.trim(),
        createdAt: now,
        questions: [],
      };
      await createQuestionSet(qs);
      navigate(`/question-set/${qs.id}`);
    } finally {
      setCreating(false);
    }
  }, [title, selectedTemplateId, navigate]);

  return (
    <div className="container py-4 max-w-600">
      <div className="page-header">
        <div className="d-flex align-items-center gap-3">
          <button type="button" className="btn-icon" onClick={() => navigate('/')} title="Back">
            <i className="bi bi-arrow-left"></i>
          </button>
          <div>
            <h1 className="mb-0">New Question <span className="text-orange">Set</span></h1>
            <p className="text-muted small mb-0 mt-1">
              Pick a saved template and give this set a title.
            </p>
          </div>
        </div>
      </div>

      <div className="card p-4">
        <div className="mb-4">
          <label className="form-label">
            Title <span className="text-danger">*</span>
          </label>
          <input
            id="qs-title"
            type="text"
            className={`form-control ${titleError ? 'is-invalid' : ''}`}
            placeholder="e.g. CTET Paper 1 – July 2026"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          {titleError && <div className="invalid-feedback">{titleError}</div>}
          <div className="form-text">This will be the .docx filename when you export.</div>
        </div>

        <div className="mb-4">
          <label className="form-label">
            Template <span className="text-danger">*</span>
          </label>
          {templates === undefined ? (
            <div className="text-muted small">Loading templates…</div>
          ) : templates.length === 0 ? (
            <div>
              <div className="alert alert-warning py-2 px-3" role="alert">
                <i className="bi bi-exclamation-triangle me-2"></i>
                No templates saved yet.{' '}
                <a href="/templates/new" className="alert-link">Create one first</a>.
              </div>
            </div>
          ) : (
            <select
              id="qs-template"
              className={`form-select ${templateError ? 'is-invalid' : ''}`}
              value={selectedTemplateId}
              onChange={(e) => setSelectedTemplateId(e.target.value)}
            >
              <option value="">— Select a template —</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          )}
          {templateError && <div className="invalid-feedback d-block">{templateError}</div>}
        </div>

        <button
          type="button"
          className="btn-orange w-100"
          onClick={handleCreate}
          disabled={creating || templates?.length === 0}
        >
          {creating ? (
            <><span className="spinner-border spinner-border-sm me-1" role="status"></span>Creating…</>
          ) : (
            <><i className="bi bi-arrow-right-circle-fill"></i> Start Entering Questions</>
          )}
        </button>
      </div>
    </div>
  );
};
