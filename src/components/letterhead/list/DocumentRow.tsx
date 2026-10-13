import React, { useState } from 'react';
import toast from 'react-hot-toast';
import type { Letterhead, PaperDoc } from '../../../letterhead/types';
import type { ToolConfig } from '../../../letterhead/tools';
import { formatDateTime } from '../../../utils/format';
import { DownloadMenu, type DownloadFormat } from '../paper/DownloadMenu';

interface Props {
  tool: ToolConfig;
  doc: PaperDoc;
  /** the design the document uses; null when it was deleted (download is then unavailable) */
  design: Letterhead | null;
  onOpen: () => void;
  onDelete: () => void;
}

export const DocumentRow = React.memo<Props>(({ tool, doc, design, onOpen, onDelete }) => {
  const [busy, setBusy] = useState(false);
  const name = doc.title.trim() || `Untitled ${tool.docSingular}`;

  // Downloads straight from the list, like question sets: no need to open the document first.
  const download = async (format: DownloadFormat) => {
    if (!design) return;
    setBusy(true);
    try {
      const { downloadDocument } = await import('../../../letterhead/downloadLetterhead');
      const { name: fileName, imageBased } = await downloadDocument(design, doc, format);
      toast.success(`Downloaded ${fileName}`);
      if (imageBased) toast('This PDF has characters outside the built-in fonts, so it was made from page images.', { duration: 6000 });
    } catch (err) {
      console.error(err);
      toast.error(format === 'docx' ? 'Could not build the .docx file.' : 'Could not build the PDF.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <li className="list-group-item d-flex align-items-center gap-3">
      <i className={`bi ${tool.docIcon} text-orange`}></i>
      <button type="button" className="btn btn-link p-0 text-start flex-grow-1 text-truncate lh-recent-name" onClick={onOpen}>
        {name}
        <span className="text-muted fw-normal small ms-2">{design?.name ?? `${tool.designSingular} deleted`}</span>
      </button>
      <span className="text-muted small d-none d-sm-inline">{formatDateTime(doc.updatedAt)}</span>
      {design && <DownloadMenu compact busy={busy} onDownload={(f) => void download(f)} />}
      <button type="button" className="btn-icon danger" aria-label={`Delete ${name}`} onClick={onDelete}>
        <i className="bi bi-trash3"></i>
      </button>
    </li>
  );
});
DocumentRow.displayName = 'DocumentRow';
