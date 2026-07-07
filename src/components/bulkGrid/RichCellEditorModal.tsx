import React, { useState } from 'react';
import { Modal, Button } from 'react-bootstrap';
import { RichTextField } from '../richTextEntry/RichTextField';
import type { RichContent } from '../../types';

interface Props {
  show: boolean;
  title: string;
  initialValue: RichContent;
  onSave: (value: RichContent) => void;
  onCancel: () => void;
}

export const RichCellEditorModal: React.FC<Props> = ({
  show,
  title,
  initialValue,
  onSave,
  onCancel,
}) => {
  const [value, setValue] = useState<RichContent>({
    html: initialValue.html,
    images: initialValue.images ? [...initialValue.images] : [],
  });

  const handleSave = () => {
    onSave(value);
  };

  return (
    <Modal show={show} onHide={onCancel} size="lg" centered>
      <Modal.Header closeButton>
        <Modal.Title>{title}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <RichTextField
          value={value}
          onChange={setValue}
          placeholder="Enter formatted text/images..."
        />
      </Modal.Body>
      <Modal.Footer>
        <Button variant="outline-dark" onClick={onCancel}>
          Cancel
        </Button>
        <Button className="btn-orange border-0" onClick={handleSave}>
          Apply Changes
        </Button>
      </Modal.Footer>
    </Modal>
  );
};
