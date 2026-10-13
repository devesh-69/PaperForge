import React from 'react';
import { Modal } from 'react-bootstrap';
import { PRESETS, type PresetKey } from '../../../letterhead/defaults';
import type { ToolConfig } from '../../../letterhead/tools';

interface Props {
  tool: ToolConfig;
  show: boolean;
  onClose: () => void;
  onPick: (preset: PresetKey) => void;
}

/** "Pick a starting point" dialog for a new design. */
export const NewLetterheadModal: React.FC<Props> = ({ tool, show, onClose, onPick }) => (
  <Modal show={show} onHide={onClose} centered>
    <Modal.Header closeButton><Modal.Title>{tool.newDesignLabel}</Modal.Title></Modal.Header>
    <Modal.Body>
      <p className="text-muted small">Pick a starting point. You can change everything afterwards.</p>
      <div className="d-grid gap-2">
        {PRESETS.filter((p) => tool.presets.includes(p.key)).map((p) => (
          <button key={p.key} type="button" className="btn-icon lh-choice" onClick={() => onPick(p.key)}>
            <div className="choice-title">{p.title}</div>
            <div className="small">{p.description}</div>
          </button>
        ))}
      </div>
    </Modal.Body>
  </Modal>
);
