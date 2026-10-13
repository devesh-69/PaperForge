// Created by Devesh Tatkare (deveshtatkare.com)
import { useCallback, useEffect, useRef, useState } from 'react';
import { db } from '../db/db';
import { savePaper } from '../letterhead/repository';
import type { Letterhead, PaperDoc } from '../letterhead/types';

export type PaperLoadState = 'loading' | 'ready' | 'missing' | 'noLetterhead';
export type SaveState = 'saved' | 'saving' | 'error';

const AUTOSAVE_DELAY_MS = 600;

/**
 * Loads a document and its letterhead, and autosaves edits (debounced). Pending
 * edits are written when the tab is hidden or the page is left.
 */
export function usePaperDoc(id: string | undefined) {
  const [doc, setDoc] = useState<PaperDoc | null>(null);
  const [letterhead, setLetterhead] = useState<Letterhead | null>(null);
  const [state, setState] = useState<PaperLoadState>('loading');
  const [saveState, setSaveState] = useState<SaveState>('saved');

  useEffect(() => {
    let cancelled = false;
    setState('loading');
    (async () => {
      const paper = id ? await db.papers.get(id) : undefined;
      if (cancelled) return;
      if (!paper) { setState('missing'); return; }
      const lh = await db.letterheads.get(paper.letterheadId);
      if (cancelled) return;
      if (!lh) { setState('noLetterhead'); return; }
      docRef.current = paper;
      setDoc(paper);
      setLetterhead(lh);
      setState('ready');
    })();
    return () => { cancelled = true; };
  }, [id]);

  const pending = useRef<PaperDoc | null>(null);
  const timer = useRef<number | undefined>(undefined);
  // the latest doc, readable synchronously (state updaters must stay free of side effects)
  const docRef = useRef<PaperDoc | null>(null);

  const flush = useCallback(async () => {
    window.clearTimeout(timer.current);
    const toSave = pending.current;
    if (!toSave) return;
    pending.current = null;
    try {
      await savePaper(toSave);
      setSaveState(pending.current ? 'saving' : 'saved');
    } catch (err) {
      console.error(err);
      setSaveState('error');
    }
  }, []);

  const update = useCallback((fn: (d: PaperDoc) => PaperDoc) => {
    const prev = docRef.current;
    if (!prev) return;
    const next = fn(prev);
    docRef.current = next;
    setDoc(next);
    pending.current = next;
    setSaveState('saving');
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => void flush(), AUTOSAVE_DELAY_MS);
  }, [flush]);

  useEffect(() => {
    const onHide = () => { if (document.visibilityState === 'hidden') void flush(); };
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('pagehide', onHide);
    return () => {
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('pagehide', onHide);
      void flush();
    };
  }, [flush]);

  return { state, doc, letterhead, update, flush, saveState };
}
