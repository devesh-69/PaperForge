import React, { useDeferredValue, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { EditorBar } from '../components/common/EditorBar';
import { DetailsCard } from '../components/letterhead/paper/DetailsCard';
import { DownloadMenu, type DownloadFormat } from '../components/letterhead/paper/DownloadMenu';
import { InstructionsCard } from '../components/letterhead/paper/InstructionsCard';
import { LetterTextCard } from '../components/letterhead/paper/LetterTextCard';
import { QuestionsCard } from '../components/letterhead/paper/QuestionsCard';
import { SaveStatus } from '../components/letterhead/paper/SaveStatus';
import { PagePreview } from '../components/letterhead/PagePreview';
import { usePaperDoc } from '../hooks/usePaperDoc';
import { findMissing } from '../letterhead/layout';
import { designEditPath, toolForKind } from '../letterhead/tools';
import { extractTokens } from '../letterhead/tokens';

/** Editor for one document: a letter or an exam paper (the tool follows from its design). */
export const PaperEditorPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { state, doc, letterhead: lh, update, flush, saveState } = usePaperDoc(id);
  const [exporting, setExporting] = useState(false);
  // the preview may lag a keystroke behind so typing stays smooth on long documents
  const previewDoc = useDeferredValue(doc);

  const tokens = useMemo(
    () => (lh ? extractTokens(lh.elements.flatMap((e) => (e.type === 'text' ? [e.text] : []))) : []),
    [lh],
  );

  if (state === 'loading') {
    return <div className="container py-5 text-center"><div className="spinner-border text-secondary" role="status"></div></div>;
  }
  if (state !== 'ready' || !doc || !lh) {
    return (
      <div className="container py-4">
        <div className="alert alert-warning" role="alert">
          <i className="bi bi-exclamation-triangle-fill me-2"></i>
          {state === 'noLetterhead' ? 'The design for this document was deleted.' : 'Document not found. It may have been deleted.'}
        </div>
        <button className="btn-outline-black" onClick={() => navigate('/letterheads')}><i className="bi bi-arrow-left"></i>Back</button>
      </div>
    );
  }

  const tool = toolForKind(lh.kind);

  const download = async (format: DownloadFormat) => {
    const missing = findMissing(lh, doc, tokens);
    if (missing.length > 0 && !window.confirm(`These are still empty:\n\n• ${missing.join('\n• ')}\n\nDownload anyway?`)) return;
    setExporting(true);
    try {
      await flush();
      // the Word / PDF code is large, so it is loaded only now
      const { downloadDocument } = await import('../letterhead/downloadLetterhead');
      const { name, imageBased } = await downloadDocument(lh, doc, format);
      toast.success(`Downloaded ${name}`);
      if (imageBased) toast('This PDF has characters outside the built-in fonts, so it was made from page images.', { duration: 6000 });
    } catch (err) {
      console.error(err);
      toast.error(format === 'docx' ? 'Could not build the .docx file.' : 'Could not build the PDF.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div>
      <EditorBar
        title={lh.kind === 'paper' ? 'Make a paper' : 'Write a letter'}
        subtitle={
          <>
            {tool.designSingular[0].toUpperCase() + tool.designSingular.slice(1)}: <strong>{lh.name}</strong>
            <button type="button" className="btn btn-link btn-sm py-0" onClick={() => navigate(designEditPath(lh.kind, lh.id))}>Edit design</button>
          </>
        }
        onBack={() => navigate(`${tool.base}?tab=documents`)}
        backLabel={`Back to ${tool.navLabel}`}
        status={<SaveStatus state={saveState} />}
      >
        <DownloadMenu busy={exporting} onDownload={(f) => void download(f)} />
      </EditorBar>

      <div className="row g-4">
        <div className="col-lg-7">
          <DetailsCard lh={lh} doc={doc} tokens={tokens} update={update} />
          {lh.kind === 'paper' ? (
            <>
              <InstructionsCard lh={lh} doc={doc} update={update} />
              <QuestionsCard lh={lh} doc={doc} update={update} />
            </>
          ) : (
            <LetterTextCard lh={lh} doc={doc} update={update} />
          )}
        </div>

        <div className="col-lg-5">
          <div className="lh-preview-wrap">
            <PagePreview letterhead={lh} doc={previewDoc ?? doc} />
          </div>
        </div>
      </div>
    </div>
  );
};
