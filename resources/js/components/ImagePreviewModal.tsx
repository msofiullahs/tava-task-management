import { useEffect } from 'react';

interface ImagePreviewModalProps {
  open: boolean;
  src: string;
  alt?: string;
  caption?: string;
  onClose: () => void;
  onDownload?: () => void;
}

/**
 * Full-bleed image lightbox. Click backdrop or hit Escape to close.
 * Doesn't reuse the generic Modal because we want a darker backdrop and the
 * image to fill the available space without a card chrome around it.
 */
export function ImagePreviewModal({ open, src, alt, caption, onClose, onDownload }: ImagePreviewModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal
      aria-label={alt || 'Image preview'}
      className="fixed inset-0 z-50 flex flex-col bg-slate-950/90 backdrop-blur-sm"
      onClick={onClose}
    >
      {/* Top bar */}
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-white/10 px-4 py-3 text-sm text-slate-200">
        <span className="truncate">{caption ?? alt ?? 'Preview'}</span>
        <div className="flex shrink-0 gap-2">
          {onDownload && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onDownload(); }}
              className="inline-flex items-center gap-1.5 rounded-md bg-white/10 px-3 py-1.5 text-sm font-medium text-white hover:bg-white/20"
            >
              <DownloadIcon /> Download
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close preview"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-white/10 text-white hover:bg-white/20"
          >
            ×
          </button>
        </div>
      </div>

      {/* Image area — click image itself does nothing (so users can right-click) */}
      <div className="flex flex-1 items-center justify-center p-6">
        <img
          src={src}
          alt={alt ?? ''}
          onClick={(e) => e.stopPropagation()}
          className="max-h-full max-w-full rounded-md object-contain shadow-2xl"
        />
      </div>
    </div>
  );
}

function DownloadIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <path d="M10 3v10m0 0-4-4m4 4 4-4M4 17h12" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
