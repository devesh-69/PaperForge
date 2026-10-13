import React, { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { newDividerElement, newLogoElement, newTextElement } from '../../../letterhead/defaults';
import type { LetterheadElement } from '../../../letterhead/types';
import { moveItem } from '../../../utils/arrays';
import { ElementEditor } from '../elements/ElementEditor';
import { FormCard } from '../FormCard';
import type { CardProps } from './cardProps';

export const ElementsCard: React.FC<CardProps> = ({ lh, set }) => {
  const [openId, setOpenId] = useState<string | null>(lh.elements[0]?.id ?? null);
  const background = lh.bandColor ?? '#ffffff';

  const add = (el: LetterheadElement) => {
    set({ elements: [...lh.elements, el] });
    setOpenId(el.id);
  };

  const duplicate = (i: number) => {
    const el = lh.elements[i];
    const copy = { ...el, id: uuidv4(), label: `${el.label} (copy)` } as LetterheadElement;
    const next = [...lh.elements];
    next.splice(i + 1, 0, copy);
    set({ elements: next });
    setOpenId(copy.id);
  };

  return (
    <FormCard
      icon="bi-layout-text-window-reverse"
      title="Header elements"
      hint="Build the letterhead from the top down. Click an element to edit it, and use the arrows to reorder."
    >
      {lh.elements.length === 0 && <div className="text-muted small">No elements yet. Add a logo, some text or a divider line below.</div>}
      {lh.elements.map((el, i) => (
        <ElementEditor
          key={el.id}
          element={el}
          palette={lh.palette}
          background={background}
          open={openId === el.id}
          isFirst={i === 0}
          isLast={i === lh.elements.length - 1}
          onToggle={() => setOpenId(openId === el.id ? null : el.id)}
          onChange={(next) => set({ elements: lh.elements.map((e) => (e.id === el.id ? next : e)) })}
          onMove={(dir) => set({ elements: moveItem(lh.elements, i, dir) })}
          onDuplicate={() => duplicate(i)}
          onRemove={() => set({ elements: lh.elements.filter((e) => e.id !== el.id) })}
        />
      ))}
      <div className="d-flex flex-wrap gap-2">
        <button type="button" className="btn-outline-black" onClick={() => add(newLogoElement())}><i className="bi bi-image"></i>Logo</button>
        <button type="button" className="btn-outline-black" onClick={() => add(newTextElement('Text line', 'New text'))}><i className="bi bi-fonts"></i>Text line</button>
        <button type="button" className="btn-outline-black" onClick={() => add(newDividerElement(lh.palette[2] ?? '#000000'))}><i className="bi bi-dash-lg"></i>Divider</button>
      </div>
    </FormCard>
  );
};
