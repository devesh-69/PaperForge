import React, { useCallback, useRef, useEffect } from 'react';
import { useEditor, useEditorState, EditorContent } from '@tiptap/react';
import type { Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import { v4 as uuidv4 } from 'uuid';
import toast from 'react-hot-toast';
import type { RichContent, EmbeddedImage } from '../../types';
import { processImageFile } from '../../utils/imageUtils';

interface Props {
  value: RichContent;
  onChange: (val: RichContent) => void;
  placeholder?: string;
  disabled?: boolean;
}

const isBlankHtml = (h: string) => h === '' || h === '<p></p>';
const sameHtml = (a: string, b: string) => a === b || (isBlankHtml(a) && isBlankHtml(b));

export const RichTextField: React.FC<Props> = ({ value, onChange, placeholder, disabled }) => {
  const valueRef = useRef(value);
  valueRef.current = value;
  const imageInputRef = useRef<HTMLInputElement>(null);
  const imagesRef = useRef<EmbeddedImage[]>(value.images ?? []);
  const insertImageRef = useRef<(file: File) => void>(() => {});

  // Keep the registry in step with the value we are given (e.g. when the
  // parent loads a different question), otherwise stale images leak across.
  useEffect(() => {
    imagesRef.current = value.images ?? [];
  }, [value.images]);

  // Only images still present in the HTML stay registered
  const emit = useCallback(
    (e: Editor) => {
      const html = e.getHTML();
      const images = imagesRef.current.filter((img) => html.includes(img.id));
      imagesRef.current = images;
      onChange({ html, images });
    },
    [onChange]
  );

  const editor = useEditor({
    extensions: [
      StarterKit,
      Image.configure({ inline: true, allowBase64: true }),
    ],
    content: value.html || '',
    editable: !disabled,
    onUpdate: ({ editor: e }) => {
      // Tiptap also fires `update` when an editor is created or synced; only
      // report genuine edits so loading a question never looks like a change.
      if (sameHtml(e.getHTML(), valueRef.current.html)) return;
      emit(e);
    },
    editorProps: {
      attributes: {
        class: 'rich-text-editor-content',
        'data-placeholder': placeholder ?? '',
      },
      handlePaste: (_view, event) => {
        const files = Array.from(event.clipboardData?.files ?? []).filter((f) => f.type.startsWith('image/'));
        if (files.length === 0) return false;
        event.preventDefault();
        files.forEach((f) => insertImageRef.current(f));
        return true;
      },
      handleDrop: (_view, event) => {
        const files = Array.from(event.dataTransfer?.files ?? []).filter((f) => f.type.startsWith('image/'));
        if (files.length === 0) return false;
        event.preventDefault();
        files.forEach((f) => insertImageRef.current(f));
        return true;
      },
    },
  });

  // Push external value changes into the editor without echoing them back as
  // user edits (setContent emits an update unless told not to).
  useEffect(() => {
    if (!editor) return;
    if (!sameHtml(value.html, editor.getHTML())) {
      editor.commands.setContent(value.html || '', { emitUpdate: false });
    }
  }, [editor, value.html]);

  useEffect(() => {
    editor?.setEditable(!disabled);
  }, [editor, disabled]);

  const handleImageUpload = useCallback(
    async (file: File) => {
      if (!editor) return;
      try {
        const { dataUrl, mimeType, widthPx, heightPx } = await processImageFile(file);
        const imageId = uuidv4();
        // The bytes live in the HTML data URL; the registry only keeps metadata.
        imagesRef.current = [...imagesRef.current, { id: imageId, mimeType, widthPx, heightPx }];
        // inserting triggers the editor's onUpdate, which emits the change
        editor.chain().focus().setImage({ src: dataUrl, alt: imageId }).run();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Could not insert the image');
      }
    },
    [editor]
  );
  insertImageRef.current = handleImageUpload;

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleImageUpload(file);
      e.target.value = '';
    },
    [handleImageUpload]
  );

  // Tiptap v3 does not re-render on every transaction, so toolbar state is subscribed explicitly
  const active = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      bold: e?.isActive('bold') ?? false,
      italic: e?.isActive('italic') ?? false,
      underline: e?.isActive('underline') ?? false,
      bulletList: e?.isActive('bulletList') ?? false,
      orderedList: e?.isActive('orderedList') ?? false,
    }),
  });

  if (!editor) return null;

  return (
    <div className={`rich-text-field ${disabled ? 'rich-text-disabled' : ''}`}>
      {!disabled && (
        <div className="rich-text-toolbar">
          <div className="btn-group btn-group-sm">
            <button
              type="button"
              className={`rich-tool-btn ${active?.bold ? 'active' : ''}`}
              onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleBold().run(); }}
              title="Bold"
            ><i className="bi bi-type-bold"></i></button>
            <button
              type="button"
              className={`rich-tool-btn ${active?.italic ? 'active' : ''}`}
              onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleItalic().run(); }}
              title="Italic"
            ><i className="bi bi-type-italic"></i></button>
            <button
              type="button"
              className={`rich-tool-btn ${active?.underline ? 'active' : ''}`}
              onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleUnderline().run(); }}
              title="Underline"
            ><i className="bi bi-type-underline"></i></button>
            <button
              type="button"
              className={`rich-tool-btn ${active?.bulletList ? 'active' : ''}`}
              onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleBulletList().run(); }}
              title="Bullet List"
            ><i className="bi bi-list-ul"></i></button>
            <button
              type="button"
              className={`rich-tool-btn ${active?.orderedList ? 'active' : ''}`}
              onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleOrderedList().run(); }}
              title="Numbered List"
            ><i className="bi bi-list-ol"></i></button>
          </div>
          <div className="ms-auto">
            <button
              type="button"
              className="rich-tool-btn"
              onMouseDown={(e) => { e.preventDefault(); imageInputRef.current?.click(); }}
              title="Insert Image"
            ><i className="bi bi-image"></i></button>
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              className="d-none"
              onChange={handleFileInputChange}
            />
          </div>
        </div>
      )}
      <EditorContent editor={editor} />
    </div>
  );
};
