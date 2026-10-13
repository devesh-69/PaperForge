import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { db } from '../db/db';
import { BackupRestoreButtons } from '../components/common/BackupRestoreButtons';
import { ConfirmDeleteModal } from '../components/common/ConfirmDeleteModal';
import { PageHeader } from '../components/common/PageHeader';
import { Tabs } from '../components/common/Tabs';
import { DesignsTab } from '../components/letterhead/list/DesignsTab';
import { DocumentsTab } from '../components/letterhead/list/DocumentsTab';
import { NewLetterheadModal } from '../components/letterhead/list/NewLetterheadModal';
import { useDesigns, useDocumentCounts, useTotalDocuments } from '../hooks/useDesignLibrary';
import { pruneOrphanAssets } from '../letterhead/assets';
import { createPaperDoc } from '../letterhead/defaults';
import { deleteLetterhead, deletePaper, duplicateLetterhead } from '../letterhead/repository';
import { designEditPath, documentPath, type ToolConfig } from '../letterhead/tools';
import type { Letterhead } from '../letterhead/types';

type Tab = 'designs' | 'documents';

/** Home page of a document tool (Letterheads or Exam Papers): its designs and its documents. */
export const ToolHomePage: React.FC<{ tool: ToolConfig }> = ({ tool }) => {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const tab: Tab = params.get('tab') === 'documents' ? 'documents' : 'designs';

  const designs = useDesigns(tool.kind);
  const counts = useDocumentCounts((designs ?? []).map((d) => d.id));
  const totalDocs = useTotalDocuments(tool.kind);

  const [showNew, setShowNew] = useState(false);
  const [deleteDesign, setDeleteDesign] = useState<Letterhead | null>(null);
  const [deleteDoc, setDeleteDoc] = useState<{ id: string; name: string } | null>(null);

  // tidy up images nothing uses any more, once per visit and without blocking the page
  useEffect(() => {
    const run = () => void pruneOrphanAssets().catch(() => undefined);
    const w = window as Window & { requestIdleCallback?: (cb: () => void) => number };
    if (w.requestIdleCallback) w.requestIdleCallback(run); else window.setTimeout(run, 2000);
  }, []);

  if (designs === undefined || counts === undefined) {
    return <div className="container py-5 text-center"><div className="spinner-border text-secondary" role="status"></div></div>;
  }

  const setTab = (t: Tab) => setParams(t === 'designs' ? {} : { tab: t }, { replace: true });

  const startDocument = async (d: Letterhead) => {
    const doc = createPaperDoc(d);
    await db.papers.add(doc);
    navigate(documentPath(d.kind, doc.id));
  };

  const deleteDocCount = deleteDesign ? counts[deleteDesign.id] ?? 0 : 0;

  return (
    <div className="container py-4">
      <PageHeader
        title={<>{tool.titleLead}<span className="text-orange">{tool.titleAccent}</span></>}
        subtitle={tool.tagline}
        right={
          <div className="d-flex gap-2 flex-wrap">
            <BackupRestoreButtons scope={tool.backupScope} noun={`${tool.backupName} and their documents`} slug={tool.backupScope === 'letters' ? 'letterheads' : 'exam_papers'} />
            <button className="btn-orange" onClick={() => setShowNew(true)}><i className="bi bi-plus-lg"></i> {tool.newDesignLabel}</button>
          </div>
        }
      />

      <Tabs
        ariaLabel={`${tool.navLabel} sections`}
        value={tab}
        onChange={setTab}
        tabs={[
          { id: 'designs', label: `${tool.designPlural[0].toUpperCase()}${tool.designPlural.slice(1)}`, count: designs.length },
          { id: 'documents', label: `${tool.docPlural[0].toUpperCase()}${tool.docPlural.slice(1)}`, count: totalDocs ?? 0 },
        ]}
      />

      {tab === 'designs' ? (
        <DesignsTab
          tool={tool}
          designs={designs}
          counts={counts}
          onCreate={() => setShowNew(true)}
          onMakeDocument={(d) => void startDocument(d)}
          onEdit={(d) => navigate(designEditPath(d.kind, d.id))}
          onDuplicate={async (d) => { await duplicateLetterhead(d.id); toast.success(`${tool.designSingular[0].toUpperCase()}${tool.designSingular.slice(1)} duplicated`); }}
          onDelete={setDeleteDesign}
        />
      ) : (
        <DocumentsTab
          tool={tool}
          designs={designs}
          onOpen={(d) => navigate(documentPath(d.kind, d.id))}
          onDelete={(d, name) => setDeleteDoc({ id: d.id, name })}
        />
      )}

      <NewLetterheadModal
        tool={tool}
        show={showNew}
        onClose={() => setShowNew(false)}
        onPick={(preset) => { setShowNew(false); navigate(`${tool.base}/new?preset=${preset}`); }}
      />

      <ConfirmDeleteModal
        show={!!deleteDesign}
        title={`Delete ${tool.designSingular}`}
        name={deleteDesign?.name}
        detail={deleteDocCount > 0 ? `Its ${deleteDocCount} ${tool.docPlural} will be deleted too. This cannot be undone.` : undefined}
        onCancel={() => setDeleteDesign(null)}
        onConfirm={async () => {
          if (deleteDesign) await deleteLetterhead(deleteDesign.id);
          setDeleteDesign(null);
          toast.success('Deleted');
        }}
      />
      <ConfirmDeleteModal
        show={!!deleteDoc}
        title={`Delete ${tool.docSingular}`}
        name={deleteDoc?.name}
        onCancel={() => setDeleteDoc(null)}
        onConfirm={async () => {
          if (deleteDoc) await deletePaper(deleteDoc.id);
          setDeleteDoc(null);
          toast.success('Deleted');
        }}
      />
    </div>
  );
};
