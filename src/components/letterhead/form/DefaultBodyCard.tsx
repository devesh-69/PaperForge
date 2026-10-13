import React from 'react';
import { FormCard } from '../FormCard';
import { LetterRichEditor } from '../rich/LetterRichEditor';
import type { CardProps } from './cardProps';

/** Letters: text that is pre-filled in every new letter (e.g. a standard notice). */
export const DefaultBodyCard: React.FC<CardProps> = ({ lh, set }) => (
  <FormCard
    icon="bi-body-text"
    title="Default letter text"
    hint="Optional. Pre-filled in every new letter, and still editable on each one. Format it, or paste from Word."
  >
    <LetterRichEditor
      value={lh.defaultBody}
      palette={lh.palette}
      placeholder="Type or paste the text every letter starts with…"
      onChange={(html) => set({ defaultBody: html })}
    />
  </FormCard>
);
