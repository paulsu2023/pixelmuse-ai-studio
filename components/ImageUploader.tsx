import React, { useRef } from 'react';
import { UploadedImage } from '../types';

interface ImageUploaderProps {
  title: string;
  subtitle?: string;
  images: UploadedImage[];
  setImages: React.Dispatch<React.SetStateAction<UploadedImage[]>>;
  maxImages?: number;
  onZoom: (img: UploadedImage) => void;
  icon?: React.ReactNode;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({
  title,
  subtitle,
  images,
  setImages,
  maxImages = 4,
  onZoom,
  icon,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      const remainingSlots = maxImages - images.length;
      const filesToProcess = files.slice(0, remainingSlots);

      filesToProcess.forEach((file: File) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          setImages((prev) => [
            ...prev,
            {
              id: Math.random().toString(36).substr(2, 9),
              file,
              previewUrl: URL.createObjectURL(file),
              base64: reader.result as string,
            },
          ]);
        };
        reader.readAsDataURL(file);
      });
    }
    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeImage = (id: string) => {
    setImages((prev) => {
      const img = prev.find(i => i.id === id);
      if (img?.previewUrl) {
        URL.revokeObjectURL(img.previewUrl); // Fix memory leak
      }
      return prev.filter((i) => i.id !== id);
    });
  };

  return (
    <div className="glass-card p-4">
      <div className="flex justify-between items-center mb-3">
        <div className="flex items-center gap-2">
          {icon && <span className="text-pink-300/70">{icon}</span>}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
              {title}
            </h3>
            {subtitle && (
              <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{subtitle}</p>
            )}
          </div>
        </div>
        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full"
          style={{
            background: 'rgba(232, 160, 191, 0.1)',
            color: 'var(--color-primary)',
            border: '1px solid rgba(232, 160, 191, 0.15)'
          }}>
          {images.length}/{maxImages}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        {images.map((img) => (
          <div key={img.id} className="img-thumb">
            <img
              src={img.previewUrl}
              alt="上传图片"
              className="cursor-pointer"
              onClick={() => onZoom(img)}
            />
            <button
              onClick={(e) => {
                e.stopPropagation();
                removeImage(img.id);
              }}
              className="remove-btn"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
        ))}

        {images.length < maxImages && (
          <div
            onClick={() => fileInputRef.current?.click()}
            className="upload-zone"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--color-primary)', opacity: 0.5 }}>
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="17 8 12 3 7 8"></polyline>
              <line x1="12" y1="3" x2="12" y2="15"></line>
            </svg>
            <span className="text-[11px] mt-1.5 font-medium" style={{ color: 'var(--text-muted)' }}>点击上传</span>
          </div>
        )}
      </div>

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        accept="image/*"
        multiple
      />
    </div>
  );
};
