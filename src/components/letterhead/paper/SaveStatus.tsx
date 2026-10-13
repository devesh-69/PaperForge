import React from 'react';
import type { SaveState } from '../../../hooks/usePaperDoc';

export const SaveStatus: React.FC<{ state: SaveState }> = ({ state }) => (
  <span className="small text-muted" role="status">
    {state === 'saving' && 'Saving…'}
    {state === 'saved' && <><i className="bi bi-check-circle-fill text-success me-1"></i>Saved</>}
    {state === 'error' && (
      <span className="text-danger"><i className="bi bi-exclamation-triangle-fill me-1"></i>Could not save (storage full?)</span>
    )}
  </span>
);
