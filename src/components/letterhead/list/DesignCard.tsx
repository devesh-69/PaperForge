import React from 'react';
import type { Letterhead } from '../../../letterhead/types';
import type { ToolConfig } from '../../../letterhead/tools';
import { formatDateTime } from '../../../utils/format';
import { LazyMount } from '../../common/LazyMount';
import { DesignThumb, THUMB_HEIGHT } from './DesignThumb';

interface Props {
  tool: ToolConfig;
  design: Letterhead;
  documentCount: number;
  onMakeDocument: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onTagClick: (tag: string) => void;
}

export const DesignCard: React.FC<Props> = ({ tool, design, documentCount, onMakeDocument, onEdit, onDuplicate, onDelete, onTagClick }) => (
  <div className="card h-100 border-0 shadow-sm lh-card">
    <button type="button" className="lh-card-thumb" onClick={onEdit} aria-label={`Edit ${design.name}`} title={`Edit ${design.name}`}>
      <LazyMount minHeight={THUMB_HEIGHT}>
        <DesignThumb design={design} />
      </LazyMount>
    </button>

    <div className="p-3 pb-2">
      <h5 className="fw-800 mb-1 text-truncate lh-card-title" title={design.name}>{design.name}</h5>
      <div className="d-flex flex-wrap gap-1 align-items-center mb-2">
        <span className="badge bg-light text-dark border">{design.page.size}</span>
        <span className="badge bg-light text-dark border">{design.placement === 'header' ? 'Every page' : 'First page'}</span>
        <span className="badge bg-light text-dark border">
          {documentCount} {documentCount === 1 ? tool.docSingular : tool.docPlural}
        </span>
      </div>
      {design.tags.length > 0 && (
        <div className="d-flex flex-wrap gap-1 mb-2">
          {design.tags.map((t) => (
            <button key={t} type="button" className="badge-tag lh-tag-btn" onClick={() => onTagClick(t)} title={`Show only “${t}”`}>{t}</button>
          ))}
        </div>
      )}
      <div className="d-flex gap-2 mt-2">
        <button className="btn-dark flex-grow-1 justify-content-center" onClick={onMakeDocument}>
          <i className="bi bi-file-earmark-plus me-1"></i> {tool.makeDocLabel}
        </button>
        <button className="btn-icon" title="Edit" aria-label={`Edit ${tool.designSingular}`} onClick={onEdit}><i className="bi bi-pencil-square"></i></button>
        <button className="btn-icon" title="Duplicate" aria-label="Duplicate" onClick={onDuplicate}><i className="bi bi-copy"></i></button>
        <button className="btn-icon danger" title="Delete" aria-label="Delete" onClick={onDelete}><i className="bi bi-trash3"></i></button>
      </div>
    </div>

    <div className="lh-card-meta">
      <span title="Created"><i className="bi bi-calendar-plus me-1"></i>{formatDateTime(design.createdAt)}</span>
      {design.updatedAt !== design.createdAt && (
        <span title="Last edited"><i className="bi bi-pencil me-1"></i>{formatDateTime(design.updatedAt)}</span>
      )}
    </div>
  </div>
);
