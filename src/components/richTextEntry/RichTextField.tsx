import React, { useCallback, useRef, useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import { v4 as uuidv4 } from 'uuid';
import type { RichContent, EmbeddedImage } from '../../types';

interface Props {
  value: RichContent;
  onChange: (val: RichContent) => void;
  placeholder?: string;
  disabled?: boolean;
}

function fileToBase64(file: File): Promise<{ base64: string; mimeType: string; widthPx?: number; heightPx?: number }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const [header, base64] = dataUrl.split(',');
      const mimeType = header.match(/:(.*?);/)?.[1] ?? 'image/png';
      const img = new window.Image();
      img.onload = () => resolve({ base64, mimeType, widthPx: img.naturalWidth, heightPx: img.naturalHeight });
      img.onerror = () => resolve({ base64, mimeType });
      img.src = dataUrl;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export const RichTextField: React.FC<Props> = ({ value, onChange, placeholder, disabled }) => {
  const imageInputRef = useRef<HTMLInputElement>(null);
  const imagesRef = useRef<EmbeddedImage[]>(value.images ?? []);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Image.configure({ inline: true, allowBase64: true }),
    ],
    content: value.html || '',
    editable: !disabled,
    onUpdate: ({ editor: e }) => {
      onChange({ html: e.getHTML(), images: imagesRef.current });
    },
    editorProps: {
      attributes: {
        class: 'rich-text-editor-content',
        'data-placeholder': placeholder ?? '',
      },
    },
  });

  useEffect(() => {
    if (editor && value.html !== editor.getHTML()) {
      editor.commands.setContent(value.html || '');
    }
  }, [editor, value.html]);

  const handleImageUpload = useCallback(
    async (file: File) => {
      if (!editor) return;
      const { base64, mimeType, widthPx, heightPx } = await fileToBase64(file);
      const imageId = uuidv4();
      const embeddedImage: EmbeddedImage = { id: imageId, base64, mimeType, widthPx, heightPx };
      imagesRef.current = [...imagesRef.current, embeddedImage];
      const dataUrl = `data:${mimeType};base64,${base64}`;
      editor.chain().focus().setImage({ src: dataUrl, alt: imageId }).run();
      onChange({ html: editor.getHTML(), images: imagesRef.current });
    },
    [editor, onChange]
  );

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleImageUpload(file);
      e.target.value = '';
    },
    [handleImageUpload]
  );

  if (!editor) return null;

  return (
    <div className={`rich-text-field ${disabled ? 'rich-text-disabled' : ''}`}>
      {!disabled && (
        <div className="rich-text-toolbar">
          <div className="btn-group btn-group-sm">
            <button
              type="button"
              className={`rich-tool-btn ${editor.isActive('bold') ? 'active' : ''}`}
              onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleBold().run(); }}
              title="Bold"
            ><i className="bi bi-type-bold"></i></button>
            <button
              type="button"
              className={`rich-tool-btn ${editor.isActive('italic') ? 'active' : ''}`}
              onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleItalic().run(); }}
              title="Italic"
            ><i className="bi bi-type-italic"></i></button>
            <button
              type="button"
              className={`rich-tool-btn ${editor.isActive('bulletList') ? 'active' : ''}`}
              onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleBulletList().run(); }}
              title="Bullet List"
            ><i className="bi bi-list-ul"></i></button>
            <button
              type="button"
              className={`rich-tool-btn ${editor.isActive('orderedList') ? 'active' : ''}`}
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
