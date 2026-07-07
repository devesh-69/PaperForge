import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { saveAs } from 'file-saver';
import { Modal, Button } from 'react-bootstrap';
import toast from 'react-hot-toast';
import { db } from '../db/db';
import { deleteQuestionSet } from '../db/questionSetRepository';
import { generateDocx, getDocxFilename } from '../export/docxExporter';
import type { QuestionSet, Template } from '../types';

export const QuestionSetsListPage: React.FC = () => {
  const navigate = useNavigate();
  const [exportingId, setExportingId] = useState<string | null>(null);

  const questionSets = useLiveQuery(() => db.questionSets.orderBy('createdAt').reverse().toArray());
  const templatesArray = useLiveQuery(() => db.templates.toArray());
  const templatesMap = new Map(templatesArray?.map((t) => [t.id, t]) || []);

  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleDeleteClick = (id: string, title: string) => {
    setDeleteTarget({ id, title });
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteQuestionSet(deleteTarget.id);
      toast.success('Question set deleted');
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  const handleExport = async (qs: QuestionSet, template?: Template) => {
    if (!template) {
      toast.error('Template not found. Cannot export.');
      return;
    }
    setExportingId(qs.id);
    try {
      const blob = await generateDocx(qs, template);
      saveAs(blob, getDocxFilename(qs));
      await db.questionSets.update(qs.id, { lastGeneratedAt: new Date().toISOString() });
      toast.success('Export successful');
    } catch (err) {
      console.error(err);
      toast.error('Export failed.');
    } finally {
      setExportingId(null);
    }
  };

  if (questionSets === undefined || templatesArray === undefined) {
    return (
      <div className="container py-5 text-center">
        <div className="spinner-border text-secondary" role="status"></div>
      </div>
    );
  }

  return (
    <div className="container py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1 className="mb-0">My Question <span className="text-orange">Sets</span></h1>
          <p className="text-muted small mb-0 mt-1">Manage your created papers</p>
        </div>
        <button className="btn-orange" onClick={() => navigate('/new-question-set')}>
          <i className="bi bi-plus-lg me-1"></i> New Question Set
        </button>
      </div>

      {questionSets.length === 0 ? (
        <div className="card p-5 text-center">
          <i className="bi bi-folder2-open text-muted mb-3" style={{ fontSize: '3rem' }}></i>
          <h5 className="text-muted">No question sets yet</h5>
          <p className="text-muted small">Create a new question set to start adding questions.</p>
        </div>
      ) : (
        <div className="row g-3">
          {questionSets.map((qs) => {
            const template = templatesMap.get(qs.templateId);
            return (
              <div key={qs.id} className="col-12 col-md-6 col-lg-4">
                <div className="card h-100 p-4 border-0 shadow-sm" style={{ borderRadius: '16px', transition: 'all 0.2s ease', background: 'var(--white)', border: '1px solid var(--border)' }}>
                  <div className="d-flex justify-content-between align-items-start mb-3">
                    <div>
                      <h5 
                        className="fw-800 mb-1 text-truncate" 
                        style={{ fontSize: '1.25rem', letterSpacing: '-0.02em', color: 'var(--black)' }} 
                        title={qs.title}
                      >
                        {qs.title}
                      </h5>
                      <div className="d-flex align-items-center text-muted small" style={{ fontWeight: 500 }}>
                        <i className="bi bi-file-earmark-text me-2 text-orange"></i>
                        {template ? template.name : 'Unknown Template'}
                      </div>
                    </div>
                  </div>
                  
                  <div className="d-flex flex-wrap gap-2 mb-4">
                    <span className="badge bg-light text-dark border px-2 py-1 rounded d-flex align-items-center gap-1" style={{ fontSize: '0.75rem', fontWeight: 600 }}>
                      <i className="bi bi-card-list text-muted"></i>
                      {qs.questions.length} {qs.questions.length === 1 ? 'Question' : 'Questions'}
                    </span>
                    <span className="badge bg-light text-dark border px-2 py-1 rounded d-flex align-items-center gap-1" style={{ fontSize: '0.75rem', fontWeight: 600 }}>
                      <i className="bi bi-calendar-event text-muted"></i>
                      {new Date(qs.createdAt).toLocaleDateString()}
                    </span>
                    {qs.lastGeneratedAt && (
                      <span className="badge bg-light text-dark border px-2 py-1 rounded d-flex align-items-center gap-1" style={{ fontSize: '0.75rem', fontWeight: 600 }}>
                        <i className="bi bi-clock-history text-muted"></i>
                        Exported {new Date(qs.lastGeneratedAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                  
                  <div className="mt-auto d-flex gap-2">
                    <button
                      className="btn-dark flex-grow-1 justify-content-center"
                      onClick={() => navigate(`/question-set/${qs.id}`)}
                    >
                      <i className="bi bi-pencil-square me-1"></i> Open Editor
                    </button>
                    <button
                      className="btn-outline-black"
                      title="Export .docx"
                      onClick={() => handleExport(qs, template)}
                      disabled={exportingId === qs.id || qs.questions.length === 0}
                    >
                      {exportingId === qs.id ? (
                        <span className="spinner-border spinner-border-sm" role="status"></span>
                      ) : (
                        <i className="bi bi-download"></i>
                      )}
                    </button>
                    <button
                      type="button"
                      className="btn-icon text-danger"
                      title="Delete"
                      onClick={() => handleDeleteClick(qs.id, qs.title)}
                    >
                      <i className="bi bi-trash3"></i>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Delete Confirmation Modal ───────────────────────────── */}
      <Modal show={!!deleteTarget} onHide={() => setDeleteTarget(null)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Delete Question Set</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p className="mb-1">
            Are you sure you want to delete{' '}
            <strong>{deleteTarget?.title}</strong>?
          </p>
          <p className="text-muted small mb-0">
            This action cannot be undone. All questions in this set will be permanently lost.
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
