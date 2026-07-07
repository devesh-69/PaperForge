import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { TemplateForm } from '../components/templateBuilder/TemplateForm';
import {
  createTemplate,
  getTemplateById,
  updateTemplate,
} from '../db/templateRepository';
import type { Template } from '../types';

export const TemplateBuilderPage: React.FC = () => {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const isEdit = !!id;

  const [loading, setLoading] = useState(isEdit);
  const [template, setTemplate] = useState<Template | undefined>(undefined);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!isEdit) return;
    setLoading(true);
    getTemplateById(id!)
      .then((t) => {
        if (!t) {
          setNotFound(true);
        } else {
          setTemplate(t);
        }
      })
      .finally(() => setLoading(false));
  }, [id, isEdit]);

  const handleSave = async (t: Template) => {
    if (isEdit) {
      await updateTemplate(t);
    } else {
      await createTemplate({
        id: t.id,
        name: t.name,
        tags: t.tags,
        maxQuestions: t.maxQuestions,
        subjectBlocks: t.subjectBlocks,
      });
    }
    navigate('/', { replace: true });
  };

  const handleCancel = () => navigate(-1);

  return (
    <div className="container py-4">
      <div className="page-header">
        <div className="d-flex align-items-center gap-3">
          <button
            type="button"
            className="btn-icon"
            onClick={() => navigate('/')}
            title="Back to Templates"
          >
            <i className="bi bi-arrow-left"></i>
          </button>
          <div>
            <h1 className="mb-0">
              {isEdit ? 'Edit Template' : 'New Template'}
            </h1>
            <p className="text-muted small mb-0 mt-1">
              {isEdit
                ? 'Modify template details and subject blocks.'
                : 'Define a reusable question paper structure.'}
            </p>
          </div>
        </div>
      </div>

      {loading && (
        <div className="text-center py-5">
          <div className="spinner-border text-secondary" role="status">
            <span className="visually-hidden">Loading template…</span>
          </div>
        </div>
      )}

      {notFound && (
        <div className="alert alert-warning" role="alert">
          <i className="bi bi-exclamation-triangle-fill me-2"></i>
          Template not found. It may have been deleted.
        </div>
      )}

      {!loading && !notFound && (
        <TemplateForm
          initial={template}
          onSave={handleSave}
          onCancel={handleCancel}
        />
      )}
    </div>
  );
};
