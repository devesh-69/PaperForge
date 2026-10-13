import React from 'react';
import { Button, Modal } from 'react-bootstrap';

interface Props {
  show: boolean;
  title: string;
  /** what is being deleted, shown in bold */
  name?: string;
  /** extra explanation under the question */
  detail?: string;
  onCancel: () => void;
  onConfirm: () => void;
}

export const ConfirmDeleteModal: React.FC<Props> = ({ show, title, name, detail, onCancel, onConfirm }) => (
  <Modal show={show} onHide={onCancel} centered>
    <Modal.Header closeButton><Modal.Title>{title}</Modal.Title></Modal.Header>
    <Modal.Body>
      <p className="mb-1">Delete <strong>{name}</strong>?</p>
      <p className="text-muted small mb-0">{detail ?? 'This cannot be undone.'}</p>
    </Modal.Body>
    <Modal.Footer>
      <Button variant="light" onClick={onCancel}>Cancel</Button>
      <Button className="btn-danger-solid" onClick={onConfirm}>Delete</Button>
    </Modal.Footer>
  </Modal>
);
