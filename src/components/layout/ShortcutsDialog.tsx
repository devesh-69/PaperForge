import React from 'react';
import { Modal } from 'react-bootstrap';

const SHORTCUTS: [string, string][] = [
  ['Search and jump anywhere', 'Ctrl K'],
  ['Save (where there is a Save)', 'Ctrl S'],
  ['Close any dialog or menu', 'Esc'],
];

export const ShortcutsDialog: React.FC<{ show: boolean; onClose: () => void }> = ({ show, onClose }) => (
  <Modal show={show} onHide={onClose} centered>
    <Modal.Header closeButton><Modal.Title>Keyboard shortcuts</Modal.Title></Modal.Header>
    <Modal.Body>
      <dl className="shortcut-list mb-0">
        {SHORTCUTS.map(([label, keys]) => (
          <React.Fragment key={label}>
            <dt>{label}</dt>
            <dd><kbd>{keys}</kbd></dd>
          </React.Fragment>
        ))}
      </dl>
      <p className="text-muted small mt-3 mb-0">On a Mac, use ⌘ instead of Ctrl.</p>
    </Modal.Body>
  </Modal>
);
