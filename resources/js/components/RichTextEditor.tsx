import { useEffect, useRef } from 'react';
import { EditorContent, useEditor, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import Link from '@tiptap/extension-link';
import clsx from 'clsx';
import http from '../lib/axios';
import { useToast } from '../lib/toast';
import { humanError } from '../lib/errors';
import type { Attachment } from '../types';

interface RichTextEditorProps {
  value: string; // HTML
  onChange: (html: string) => void;
  /** Required when image uploads are enabled — uploads attach to this task. */
  taskId?: number;
  disabled?: boolean;
  placeholder?: string;
  /** Fires after the editor loses focus — handy for "save on blur" patterns. */
  onBlur?: () => void;
}

/**
 * TipTap-based WYSIWYG. The schema acts as a whitelist (only nodes/marks we
 * register can be in the output HTML), which lets us safely round-trip the
 * description through the database and back without DOMPurify.
 *
 * Image uploads go through the existing /api/attachments endpoint. They
 * attach to the parent task so the file is cleaned up on task delete, and
 * they show up in the global Files page like any other attachment.
 */
export function RichTextEditor({
  value, onChange, taskId, disabled, placeholder = 'Add details, paste images, drop files…', onBlur,
}: RichTextEditorProps) {
  const { toast } = useToast();
  const lastEmittedRef = useRef(value);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // Disable code blocks (they get hard to style; keep inline code via Mark)
        codeBlock: false,
      }),
      Image.configure({
        HTMLAttributes: {
          // Images render at full container width by default but with max-height so
          // tall screenshots don't take over the whole panel.
          class: 'rounded-md max-h-96 w-auto',
        },
      }),
      Link.configure({
        openOnClick: false,
        autolink: true,
        HTMLAttributes: { rel: 'noopener noreferrer', target: '_blank', class: 'text-indigo-600 underline' },
      }),
      Placeholder.configure({ placeholder }),
    ],
    content: value || '',
    editable: !disabled,
    editorProps: {
      attributes: {
        // tiptap-content hooks the prose styles defined in app.css
        class: clsx(
          'tiptap-content min-h-[120px] w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm',
          'focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500',
          'dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100',
        ),
      },
      // Hook paste + drop so images get pulled out and either uploaded (when
      // we know the parent task) or inlined as data URLs for later upload (the
      // new-task flow — see rewriteInlineImagesForTask in NewTaskModal).
      handlePaste: (_view, event) => {
        const files = Array.from(event.clipboardData?.files ?? []).filter((f) => f.type.startsWith('image/'));
        if (files.length === 0) return false;
        event.preventDefault();
        files.forEach((file) => insertImage(editor, file, taskId, (msg) => toast({ message: msg, tone: 'error' })));
        return true;
      },
      handleDrop: (_view, event) => {
        const files = Array.from(event.dataTransfer?.files ?? []).filter((f) => f.type.startsWith('image/'));
        if (files.length === 0) return false;
        event.preventDefault();
        files.forEach((file) => insertImage(editor, file, taskId, (msg) => toast({ message: msg, tone: 'error' })));
        return true;
      },
    },
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      lastEmittedRef.current = html;
      onChange(html);
    },
    onBlur: () => onBlur?.(),
  });

  // Keep the editor in sync if the underlying value changes from outside
  // (e.g. server refresh) — but skip when it's just our own emit echoing back.
  useEffect(() => {
    if (!editor) return;
    if (value !== lastEmittedRef.current && value !== editor.getHTML()) {
      // TipTap v3: pass options object — emitUpdate:false avoids a re-emit loop with our parent.
      editor.commands.setContent(value || '', { emitUpdate: false });
    }
  }, [editor, value]);

  useEffect(() => {
    if (!editor) return;
    editor.setEditable(!disabled);
  }, [editor, disabled]);

  if (!editor) return null;

  return (
    <div className="space-y-2">
      {!disabled && <Toolbar editor={editor} taskId={taskId} />}
      <EditorContent editor={editor} />
    </div>
  );
}

function Toolbar({ editor, taskId }: { editor: Editor; taskId?: number }) {
  const { toast } = useToast();
  const fileInput = useRef<HTMLInputElement>(null);

  const onPickFile = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast({ message: 'Only images can be inserted into the description.', tone: 'error' });
      return;
    }
    insertImage(editor, file, taskId, (msg) => toast({ message: msg, tone: 'error' }));
  };

  const addLink = () => {
    const previous = editor.getAttributes('link').href;
    const url = window.prompt('Link URL', previous || 'https://');
    if (url === null) return;
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  };

  return (
    <div className="flex flex-wrap items-center gap-1 rounded-md border border-slate-200 bg-slate-50 p-1 dark:border-slate-800 dark:bg-slate-800/40">
      <Btn active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()} title="Bold (⌘B)"><b>B</b></Btn>
      <Btn active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()} title="Italic (⌘I)"><i>I</i></Btn>
      <Btn active={editor.isActive('strike')} onClick={() => editor.chain().focus().toggleStrike().run()} title="Strikethrough"><s>S</s></Btn>
      <Btn active={editor.isActive('code')} onClick={() => editor.chain().focus().toggleCode().run()} title="Inline code">{`<>`}</Btn>
      <Divider />
      <Btn active={editor.isActive('heading', { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} title="Heading">H</Btn>
      <Btn active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()} title="Bullet list">•</Btn>
      <Btn active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()} title="Numbered list">1.</Btn>
      <Btn active={editor.isActive('blockquote')} onClick={() => editor.chain().focus().toggleBlockquote().run()} title="Quote">"</Btn>
      <Divider />
      <Btn active={editor.isActive('link')} onClick={addLink} title="Link">↗</Btn>
      <input
        ref={fileInput}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => { onPickFile(e.target.files?.[0]); e.target.value = ''; }}
      />
      <Btn onClick={() => fileInput.current?.click()} title="Insert image">🖼</Btn>
    </div>
  );
}

function Btn({
  children, onClick, active, title,
}: { children: React.ReactNode; onClick: () => void; active?: boolean; title: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      aria-pressed={active}
      className={clsx(
        'inline-flex h-7 min-w-7 items-center justify-center rounded px-1.5 text-xs font-medium transition',
        active
          ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-200'
          : 'text-slate-600 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-700',
      )}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <span aria-hidden className="mx-1 h-5 w-px bg-slate-200 dark:bg-slate-700" />;
}

/**
 * Insert an image into the editor. Two paths:
 *   • taskId is set (editing an existing task) — upload immediately, insert the file URL.
 *   • taskId is missing (new-task modal) — embed as a data: URL. The caller is
 *     expected to upload + rewrite after the task gets created. See
 *     {@link rewriteInlineImagesForTask}.
 */
function insertImage(editor: Editor | null, file: File, taskId: number | undefined, onError: (msg: string) => void): void {
  if (!editor) return;
  if (taskId !== undefined) {
    void uploadAndInsert(editor, file, taskId, onError);
  } else {
    insertAsDataUrl(editor, file);
  }
}

async function uploadAndInsert(editor: Editor, file: File, taskId: number, onError: (msg: string) => void): Promise<void> {
  try {
    const form = new FormData();
    form.append('file', file);
    form.append('attachable_type', 'task');
    form.append('attachable_id', String(taskId));
    const res = await http.post<{ attachment: Attachment }>('/attachments', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    editor.chain().focus().setImage({ src: res.data.attachment.url, alt: res.data.attachment.original_name }).run();
  } catch (err) {
    onError(humanError(err, 'Couldn\'t upload that image.'));
  }
}

function insertAsDataUrl(editor: Editor, file: File): void {
  const reader = new FileReader();
  reader.onload = () => {
    const src = String(reader.result || '');
    if (src) editor.chain().focus().setImage({ src, alt: file.name }).run();
  };
  reader.readAsDataURL(file);
}

/**
 * Walk an HTML string, upload every embedded `data:image/...` to the given task
 * via /api/attachments, and return the rewritten HTML where data URLs have been
 * replaced with the returned file URLs. No-op when there are no inline images.
 *
 * Called by the new-task flow right after task creation — the editor doesn't
 * have a taskId until then, so paste/drop/picker inserts as data URLs and we
 * stitch them up here.
 */
export async function rewriteInlineImagesForTask(html: string, taskId: number): Promise<string> {
  const dataUrls = Array.from(new Set(html.match(/data:image\/[^"')\s]+/g) ?? []));
  if (dataUrls.length === 0) return html;

  let result = html;
  for (const [i, dataUrl] of dataUrls.entries()) {
    try {
      const blob = await (await fetch(dataUrl)).blob();
      const ext = (blob.type.split('/')[1] || 'png').replace(/\+.*$/, '');
      const file = new File([blob], `pasted-${i + 1}.${ext}`, { type: blob.type });
      const form = new FormData();
      form.append('file', file);
      form.append('attachable_type', 'task');
      form.append('attachable_id', String(taskId));
      const res = await http.post<{ attachment: Attachment }>('/attachments', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      // String.replaceAll-equivalent that doesn't choke on regex metachars in the data URL.
      result = result.split(dataUrl).join(res.data.attachment.url);
    } catch {
      // Leave the data URL in place if upload fails — the image still renders.
      // The user can edit the task later and re-save to retry.
    }
  }
  return result;
}
