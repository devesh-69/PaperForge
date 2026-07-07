import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { Modal, Button } from 'react-bootstrap';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../db/db';
import { deleteTemplate, createTemplate } from '../db/templateRepository';
import type { Template } from '../types';

export const TemplatesPage: React.FC = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [tagFilter, setTagFilter] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Template | null>(null);
  const [deleting, setDeleting] = useState(false);

  const allTemplates = useLiveQuery(() => db.templates.orderBy('createdAt').reverse().toArray());

  // Collect all unique tags
  const allTags = React.useMemo(() => {
    if (!allTemplates) return [];
    const set = new Set<string>();
    allTemplates.forEach((t) => t.tags.forEach((tag) => set.add(tag)));
    return Array.from(set).sort();
  }, [allTemplates]);

  // Filtered list
  const filtered = React.useMemo(() => {
    if (!allTemplates) return [];
    return allTemplates.filter((t) => {
      const matchesSearch = !search || t.name.toLowerCase().includes(search.toLowerCase());
      const matchesTag = !tagFilter || t.tags.includes(tagFilter);
      return matchesSearch && matchesTag;
    });
  }, [allTemplates, search, tagFilter]);

  const handleDuplicate = async (t: Template) => {
    const now = new Date().toISOString();
    const copy: Template = {
      ...t,
      id: uuidv4(),
      name: `${t.name} (Copy)`,
      createdAt: now,
      updatedAt: now,
      subjectBlocks: t.subjectBlocks.map((b) => ({ ...b, id: uuidv4() })),
    };
    await createTemplate({
      id: copy.id,
      name: copy.name,
      tags: copy.tags,
      maxQuestions: copy.maxQuestions,
      subjectBlocks: copy.subjectBlocks,
    });
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteTemplate(deleteTarget.id);
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  return (
    <div className="container py-4">
      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="page-header">
        <div className="d-flex justify-content-between align-items-start flex-wrap gap-3">
          <div>
            <h1 className="mb-1">
              Template <span className="page-title-accent">Library</span>
            </h1>
            <p className="text-muted mb-0 small">
              {allTemplates?.length ?? 0} template{(allTemplates?.length ?? 0) !== 1 ? 's' : ''} saved
            </p>
          </div>
          <Link to="/templates/new" className="btn-orange text-decoration-none">
            <i className="bi bi-plus-lg"></i>
            New Template
          </Link>
        </div>
      </div>

      {/* ── Filters ────────────────────────────────────────────── */}
      {(allTemplates?.length ?? 0) > 0 && (
        <div className="d-flex gap-2 mb-4 flex-wrap">
          <div className="position-relative" style={{ maxWidth: 280, flex: '1 1 auto' }}>
            <i
              className="bi bi-search position-absolute"
              style={{ left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)', fontSize: '0.85rem' }}
            ></i>
            <input
              id="template-search"
              type="text"
              className="form-control ps-4"
              placeholder="Search templates…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          {allTags.length > 0 && (
            <select
              className="form-select"
              style={{ maxWidth: 200 }}
              value={tagFilter}
              onChange={(e) => setTagFilter(e.target.value)}
            >
              <option value="">All Tags</option>
              {allTags.map((tag) => (
                <option key={tag} value={tag}>{tag}</option>
              ))}
            </select>
          )}
          {(search || tagFilter) && (
            <button
              type="button"
              className="btn-icon"
              onClick={() => { setSearch(''); setTagFilter(''); }}
            >
              <i className="bi bi-x-lg"></i>
              Clear
            </button>
          )}
        </div>
      )}

      {/* ── Loading ─────────────────────────────────────────────── */}
      {allTemplates === undefined && (
        <div className="text-center py-5">
          <div className="spinner-border text-secondary" role="status">
            <span className="visually-hidden">Loading…</span>
          </div>
        </div>
      )}

      {/* ── Empty state ─────────────────────────────────────────── */}
      {allTemplates !== undefined && allTemplates.length === 0 && (
        <div className="empty-state">
          <i className="bi bi-folder2-open empty-state-icon"></i>
          <h3>No templates yet</h3>
          <p>Create your first template to start building question papers.</p>
          <Link to="/templates/new" className="btn-orange text-decoration-none">
            <i className="bi bi-plus-lg"></i>
            Create First Template
          </Link>
        </div>
      )}

      {/* ── No filter results ──────────────────────────────────── */}
      {allTemplates !== undefined && allTemplates.length > 0 && filtered.length === 0 && (
        <div className="empty-state">
          <i className="bi bi-search empty-state-icon"></i>
          <h3>No results</h3>
          <p>No templates match your search or tag filter.</p>
          <button
            type="button"
            className="btn-outline-black"
            onClick={() => { setSearch(''); setTagFilter(''); }}
          >
            Clear filters
          </button>
        </div>
      )}

      {/* ── Template cards ──────────────────────────────────────── */}
      {filtered.length > 0 && (
        <div className="row g-3">
          {filtered.map((t) => (
            <div key={t.id} className="col-md-6 col-xl-4">
              <div className="card h-100">
                <div className="card-body p-4">
                  {/* Name + actions */}
                  <div className="d-flex justify-content-between align-items-start gap-2 mb-2">
                    <h5 className="mb-0 fw-700 ls-tight" style={{ fontSize: '1rem', lineHeight: 1.3 }}>
                      {t.name}
                    </h5>
                    <div className="d-flex gap-1 flex-shrink-0">
                      <button
                        className="btn-icon"
                        title="Edit"
                        onClick={() => navigate(`/templates/edit/${t.id}`)}
                      >
                        <i className="bi bi-pencil"></i>
                      </button>
                      <button
                        className="btn-icon"
                        title="Duplicate"
                        onClick={() => handleDuplicate(t)}
                      >
                        <i className="bi bi-copy"></i>
                      </button>
                      <button
                        className="btn-icon danger"
                        title="Delete"
                        onClick={() => setDeleteTarget(t)}
                      >
                        <i className="bi bi-trash"></i>
                      </button>
                    </div>
                  </div>

                  {/* Tags */}
                  {t.tags.length > 0 && (
                    <div className="d-flex flex-wrap gap-1 mb-3">
                      {t.tags.map((tag) => (
                        <span key={tag} className="badge-tag">{tag}</span>
                      ))}
                    </div>
                  )}

                  {/* Meta row */}
                  <div className="d-flex gap-3 mb-3" style={{ fontSize: '0.78rem', color: 'var(--gray-500)' }}>
                    <span>
                      <i className="bi bi-list-ol me-1"></i>
                      {t.maxQuestions ? `${t.maxQuestions} questions` : 'Unlimited'}
                    </span>
                    <span>
                      <i className="bi bi-layers me-1"></i>
                      {t.subjectBlocks.length} block{t.subjectBlocks.length !== 1 ? 's' : ''}
                    </span>
                  </div>

                  {/* Subject blocks summary */}
                  <div className="d-flex flex-column gap-1">
                    {t.subjectBlocks.map((block) => (
                      <div
                        key={block.id}
                        className="d-flex align-items-center justify-content-between px-2 py-1 rounded"
                        style={{ background: 'var(--gray-50)', border: '1px solid var(--border)', fontSize: '0.78rem' }}
                      >
                        <span className="fw-600 text-muted">
                          Q{block.startQ}–Q{block.endQ}
                        </span>
                        <span className="fw-600" style={{ color: 'var(--black)' }}>
                          {block.subject}
                        </span>
                        {block.questionType && (
                          <span className="badge-orange">{block.questionType}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="card-footer bg-transparent border-top px-4 py-2"
                  style={{ fontSize: '0.72rem', color: 'var(--gray-400)' }}>
                  Updated {new Date(t.updatedAt).toLocaleDateString()}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Delete Confirmation Modal ───────────────────────────── */}
      <Modal show={!!deleteTarget} onHide={() => setDeleteTarget(null)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Delete Template</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p className="mb-1">
            Are you sure you want to delete{' '}
            <strong>{deleteTarget?.name}</strong>?
          </p>
          <p className="text-muted small mb-0">
            This action cannot be undone. Any question sets based on this template will remain, but re-linking will not be possible.
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
                <span className="spinner-border spinner-border-sm me-1" role="status"></span>
                Deleting…
              </>
            ) : (
              <>
                <i className="bi bi-trash me-1"></i>
                Delete Template
              </>
            )}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};
