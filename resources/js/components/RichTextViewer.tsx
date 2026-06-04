import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import clsx from 'clsx';

interface RichTextViewerProps {
  html: string;
  className?: string;
}

/**
 * Read-only TipTap renderer. Uses the same schema as RichTextEditor so the
 * HTML written by the editor renders identically here — and any nodes outside
 * the schema are silently dropped, which is the implicit sanitisation guarantee.
 */
export function RichTextViewer({ html, className }: RichTextViewerProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ codeBlock: false }),
      Image.configure({ HTMLAttributes: { class: 'rounded-md max-h-96 w-auto' } }),
      Link.configure({
        openOnClick: true,
        HTMLAttributes: { rel: 'noopener noreferrer', target: '_blank', class: 'text-indigo-600 underline' },
      }),
    ],
    content: html || '',
    editable: false,
  });

  if (!editor) return null;
  if (!html || html === '<p></p>') return null;

  return <EditorContent editor={editor} className={clsx('tiptap-content', className)} />;
}
