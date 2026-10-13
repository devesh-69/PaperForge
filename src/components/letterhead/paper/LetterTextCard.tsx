import React from 'react';
import type { Letterhead, PaperDoc } from '../../../letterhead/types';
import { FormCard } from '../FormCard';
import { LetterRichEditor } from '../rich/LetterRichEditor';

interface Props {
  lh: Letterhead;
  doc: PaperDoc;
  update: (fn: (d: PaperDoc) => PaperDoc) => void;
}

export const LetterTextCard: React.FC<Props> = ({ lh, doc, update }) => (
  <FormCard icon="bi-body-text" title="Letter text" hint="Format it here, or paste from Word or a web page — bold, colours, lists and tables are kept.">
    <LetterRichEditor
      value={doc.letterBody}
      palette={lh.palette}
      placeholder="Type or paste the letter…"
      onChange={(html) => update((d) => ({ ...d, letterBody: html }))}
    />
  </FormCard>
);
