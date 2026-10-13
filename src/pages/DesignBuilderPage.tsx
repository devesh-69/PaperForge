import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { db } from '../db/db';
import { EditorBar } from '../components/common/EditorBar';
import { PageHeader } from '../components/common/PageHeader';
import { LetterheadForm } from '../components/letterhead/form/LetterheadForm';
import { PagePreview } from '../components/letterhead/PagePreview';
import { useUnsavedGuard } from '../hooks/useUnsavedGuard';
import { createLetterhead, createPaperDoc, isPresetKey, type PresetKey } from '../letterhead/defaults';
import { saveLetterhead } from '../letterhead/repository';
import { designEditPath, documentPath, type ToolConfig } from '../letterhead/tools';
import type { Letterhead } from '../letterhead/types';

const cap = (s: string) => s[0].toUpperCase() + s.slice(1);

/** Builder for one tool's designs (a letterhead, or an exam paper format). */
export const DesignBuilderPage: React.FC<{ tool: ToolConfig }> = ({ tool }) => {
  const { id } = useParams<{ id?: string }>();
  const [search] = useSearchParams();
  const navigate = useNavigate();
  const isEdit = !!id;

  const [lh, setLh] = useState<Letterhead | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [nameError, setNameError] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);
  const baseline = useRef('');

  // Load (edit) or create (new) once per route.
  useEffect(() => {
    let cancelled = false;
    setNotFound(false);
    if (isEdit) {
      setLh(null);
      db.letterheads.get(id!).then((found) => {
        if (cancelled) return;
        if (!found) { setNotFound(true); return; }
        // opened through the other tool's address: send it to the right tool
        if (found.kind !== tool.kind) { navigate(designEditPath(found.kind, found.id), { replace: true }); return; }
        baseline.current = JSON.stringify(found);
        setLh(found);
      });
    } else {
      const p = search.get('preset');
      const preset: PresetKey = isPresetKey(p) && tool.presets.includes(p) ? p : tool.presets[0];
      const fresh = createLetterhead(preset);
      baseline.current = JSON.stringify(fresh);
      setLh(fresh);
    }
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, isEdit, tool.kind]);

  const dirty = lh !== null && JSON.stringify(lh) !== baseline.current;
  const { markClean } = useUnsavedGuard(dirty);

  const sampleDoc = useMemo(() => (lh ? createPaperDoc(lh) : null), [lh]);

  const save = async (andFill: boolean) => {
    if (!lh) return;
    if (!lh.name.trim()) {
      setNameError(`Give the ${tool.designSingular} a name.`);
      document.getElementById('lh-name')?.focus();
      return;
    }
    setNameError(undefined);
    setSaving(true);
    try {
      const saved = await saveLetterhead(lh);
      baseline.current = JSON.stringify(saved);
      setLh(saved);
      markClean();
      if (andFill) {
        const doc = createPaperDoc(saved);
        await db.papers.add(doc);
        navigate(documentPath(saved.kind, doc.id), { replace: true });
        return;
      }
      toast.success(`${cap(tool.designSingular)} saved`);
      if (!isEdit) navigate(designEditPath(saved.kind, saved.id), { replace: true });
    } catch (err) {
      console.error(err);
      toast.error('Could not save. Your browser storage may be full.');
    } finally {
      setSaving(false);
    }
  };

  // Ctrl/Cmd+S saves
  const saveRef = useRef(save);
  saveRef.current = save;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        void saveRef.current(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const title = cap(`${isEdit ? 'Edit' : 'New'} ${tool.designSingular}`);

  return (
    <div>
      {lh ? (
        <EditorBar
          title={title}
          subtitle={`Design it once, then fill it in for every ${tool.docSingular}.`}
          onBack={() => navigate(tool.base)}
          backLabel={`Back to ${tool.navLabel}`}
          status={dirty ? <><i className="bi bi-circle-fill text-orange lh-dirty-dot"></i> Unsaved changes</> : undefined}
        >
          <button type="button" className="btn-outline-black" onClick={() => navigate(tool.base)} disabled={saving}>
            <i className="bi bi-x-lg"></i>Cancel
          </button>
          <button type="button" className="btn-outline-black" onClick={() => void save(true)} disabled={saving}>
            <i className="bi bi-file-earmark-text"></i>{`Save & ${tool.makeDocLabel.toLowerCase()}`}
          </button>
          <button type="button" className="btn-orange" onClick={() => void save(false)} disabled={saving}>
            <i className="bi bi-floppy-fill"></i>{saving ? 'Saving…' : `Save ${tool.designSingular}`}
          </button>
        </EditorBar>
      ) : (
        <PageHeader title={title} onBack={() => navigate(tool.base)} backLabel={`Back to ${tool.navLabel}`} />
      )}

      {notFound && (
        <div className="alert alert-warning" role="alert">
          <i className="bi bi-exclamation-triangle-fill me-2"></i>
          Not found. It may have been deleted.
        </div>
      )}

      {!notFound && !lh && (
        <div className="text-center py-5">
          <div className="spinner-border text-secondary" role="status"><span className="visually-hidden">Loading…</span></div>
        </div>
      )}

      {lh && sampleDoc && (
        <div className="row g-4">
          <div className="col-lg-7">
            <LetterheadForm tool={tool} value={lh} onChange={setLh} nameError={nameError} />
          </div>
          <div className="col-lg-5">
            <div className="lh-preview-wrap">
              <PagePreview letterhead={lh} doc={sampleDoc} />
              <p className="text-muted small mt-2 mb-0">Highlighted parts are filled in on each {tool.docSingular}.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
