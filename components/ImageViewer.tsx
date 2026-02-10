import React from 'react';

interface ImageViewerProps {
  url: string | null;
  onClose: () => void;
}

export const ImageViewer: React.FC<ImageViewerProps> = ({ url, onClose }) => {
  if (!url) return null;

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
    >
      <div className="relative max-w-full max-h-full animate-fade-in-up">
        <img
          src={url}
          alt="预览大图"
          className="max-w-[90vw] max-h-[90vh] object-contain rounded-2xl"
          style={{ boxShadow: '0 24px 64px rgba(0,0,0,0.5), 0 0 60px rgba(232, 160, 191, 0.08)' }}
          onClick={(e) => e.stopPropagation()}
        />
        <button
          className="absolute -top-3 -right-3 w-10 h-10 rounded-full flex items-center justify-center transition-all hover:scale-110"
          style={{
            background: 'rgba(30, 16, 40, 0.9)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(232, 160, 191, 0.3)',
            color: 'var(--color-primary)',
          }}
          onClick={onClose}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
    </div>
  );
};
