import React from 'react';
import { useEditorState, type Editor } from '@tiptap/react';
import { normalizeHex } from '../../../letterhead/color';
import { ToolbarButton } from './ToolbarButton';

interface Props {
  editor: Editor;
  palette: string[];
}

const BLOCK_STYLES = [
  { value: 'p', label: 'Paragraph' },
  { value: '1', label: 'Heading 1' },
  { value: '2', label: 'Heading 2' },
  { value: '3', label: 'Heading 3' },
];

export const RichToolbar: React.FC<Props> = ({ editor, palette }) => {
  // Tiptap v3 does not re-render on every transaction, so toolbar state is subscribed explicitly
  const s = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      bold: e.isActive('bold'),
      italic: e.isActive('italic'),
      underline: e.isActive('underline'),
      strike: e.isActive('strike'),
      bulletList: e.isActive('bulletList'),
      orderedList: e.isActive('orderedList'),
      left: e.isActive({ textAlign: 'left' }),
      center: e.isActive({ textAlign: 'center' }),
      right: e.isActive({ textAlign: 'right' }),
      justify: e.isActive({ textAlign: 'justify' }),
      inTable: e.isActive('table'),
      block: e.isActive('heading', { level: 1 }) ? '1' : e.isActive('heading', { level: 2 }) ? '2' : e.isActive('heading', { level: 3 }) ? '3' : 'p',
      color: (e.getAttributes('textStyle').color as string | undefined) ?? '',
      canUndo: e.can().undo(),
      canRedo: e.can().redo(),
    }),
  });
  const chain = () => editor.chain().focus();

  return (
    <div className="rich-text-toolbar" role="toolbar" aria-label="Letter formatting">
      <div className="rich-tool-group">
        <ToolbarButton title="Undo" icon="bi-arrow-counterclockwise" disabled={!s.canUndo} onClick={() => chain().undo().run()} />
        <ToolbarButton title="Redo" icon="bi-arrow-clockwise" disabled={!s.canRedo} onClick={() => chain().redo().run()} />
      </div>
      <span className="rich-tool-sep" />

      <select
        className="form-select form-select-sm w-auto"
        aria-label="Text style"
        value={s.block}
        onChange={(e) => {
          const v = e.target.value;
          if (v === 'p') chain().setParagraph().run();
          else chain().setHeading({ level: Number(v) as 1 | 2 | 3 }).run();
        }}
      >
        {BLOCK_STYLES.map((b) => <option key={b.value} value={b.value}>{b.label}</option>)}
      </select>
      <span className="rich-tool-sep" />

      <div className="rich-tool-group">
        <ToolbarButton title="Bold" icon="bi-type-bold" active={s.bold} onClick={() => chain().toggleBold().run()} />
        <ToolbarButton title="Italic" icon="bi-type-italic" active={s.italic} onClick={() => chain().toggleItalic().run()} />
        <ToolbarButton title="Underline" icon="bi-type-underline" active={s.underline} onClick={() => chain().toggleUnderline().run()} />
        <ToolbarButton title="Strikethrough" icon="bi-type-strikethrough" active={s.strike} onClick={() => chain().toggleStrike().run()} />
      </div>
      <span className="rich-tool-sep" />

      <div className="rich-tool-group" aria-label="Text colour">
        <input
          type="color"
          className="rich-tool-color"
          aria-label="Text colour"
          title="Text colour"
          value={normalizeHex(s.color) ?? '#000000'}
          onChange={(e) => chain().setColor(e.target.value).run()}
        />
        {palette.map((c) => (
          <button
            key={c}
            type="button"
            className="rich-tool-swatch"
            style={{ background: c }}
            title={`Colour ${c}`}
            aria-label={`Colour ${c}`}
            onMouseDown={(e) => { e.preventDefault(); chain().setColor(c).run(); }}
          />
        ))}
        <ToolbarButton title="Remove colour" icon="bi-x-circle" onClick={() => chain().unsetColor().run()} />
      </div>
      <span className="rich-tool-sep" />

      <div className="rich-tool-group">
        <ToolbarButton title="Bullet list" icon="bi-list-ul" active={s.bulletList} onClick={() => chain().toggleBulletList().run()} />
        <ToolbarButton title="Numbered list" icon="bi-list-ol" active={s.orderedList} onClick={() => chain().toggleOrderedList().run()} />
      </div>
      <span className="rich-tool-sep" />

      <div className="rich-tool-group">
        <ToolbarButton title="Align left" icon="bi-text-left" active={s.left} onClick={() => chain().setTextAlign('left').run()} />
        <ToolbarButton title="Align centre" icon="bi-text-center" active={s.center} onClick={() => chain().setTextAlign('center').run()} />
        <ToolbarButton title="Align right" icon="bi-text-right" active={s.right} onClick={() => chain().setTextAlign('right').run()} />
        <ToolbarButton title="Justify" icon="bi-justify" active={s.justify} onClick={() => chain().setTextAlign('justify').run()} />
      </div>
      <span className="rich-tool-sep" />

      <div className="rich-tool-group">
        <ToolbarButton title="Insert table (3 × 3)" icon="bi-table" onClick={() => chain().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()} />
        {s.inTable && (
          <>
            <ToolbarButton title="Add row below" icon="bi-plus-square" onClick={() => chain().addRowAfter().run()} />
            <ToolbarButton title="Add column right" icon="bi-layout-sidebar-inset-reverse" onClick={() => chain().addColumnAfter().run()} />
            <ToolbarButton title="Delete row" icon="bi-dash-square" onClick={() => chain().deleteRow().run()} />
            <ToolbarButton title="Delete column" icon="bi-layout-sidebar-inset" onClick={() => chain().deleteColumn().run()} />
            <ToolbarButton title="Merge or split cells" icon="bi-columns-gap" onClick={() => chain().mergeOrSplit().run()} />
            <ToolbarButton title="Delete table" icon="bi-trash3" onClick={() => chain().deleteTable().run()} />
          </>
        )}
      </div>
    </div>
  );
};
