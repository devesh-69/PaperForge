import React, { useEffect, useRef } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TextAlign from '@tiptap/extension-text-align';
import { Table, TableCell, TableHeader, TableRow } from '@tiptap/extension-table';
import { Color, TextStyle } from '@tiptap/extension-text-style';
import { letterBodyToHtml } from '../../../letterhead/richText';
import { RichToolbar } from './RichToolbar';

interface Props {
  /** HTML (or, for older documents, plain text) */
  value: string;
  onChange: (html: string) => void;
  /** brand colours offered in the toolbar */
  palette: string[];
  placeholder?: string;
}

const isBlank = (h: string) => h === '' || h === '<p></p>';
const sameHtml = (a: string, b: string) => a === b || (isBlank(a) && isBlank(b));

/** Rich-text editor for the letter body: formatting, colours, lists, alignment and tables. Pasting from Word keeps them. */
export const LetterRichEditor: React.FC<Props> = ({ value, onChange, palette, placeholder }) => {
  const valueRef = useRef(value);
  valueRef.current = value;

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ link: false }),
      TextStyle,
      Color,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Table.configure({ resizable: false }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    content: letterBodyToHtml(value),
    onUpdate: ({ editor: e }) => {
      // Tiptap also fires `update` when an editor is created or synced; only report genuine edits
      const html = e.getHTML();
      if (sameHtml(html, letterBodyToHtml(valueRef.current))) return;
      onChange(isBlank(html) ? '' : html);
    },
    editorProps: {
      attributes: {
        class: 'rich-text-editor-content',
        'data-placeholder': placeholder ?? '',
        'aria-label': 'Letter text',
      },
    },
  });

  // Push external changes (e.g. another document loaded) into the editor without echoing them back
  useEffect(() => {
    if (!editor) return;
    const next = letterBodyToHtml(value);
    if (!sameHtml(next, editor.getHTML())) editor.commands.setContent(next, { emitUpdate: false });
  }, [editor, value]);

  if (!editor) return null;
  return (
    <div className="rich-text-field lh-letter-editor">
      <RichToolbar editor={editor} palette={palette} />
      <EditorContent editor={editor} />
    </div>
  );
};
