import React, { useState, useRef } from 'react';
import { UploadCloud, X, Loader2, Image as ImageIcon } from 'lucide-react';
import { uploadImageFile, describeUploadError } from '../hooks/useImageUploader';

interface ImageUploadProps {
  value: string;
  onChange: (url: string) => void;
  label?: string;
  placeholder?: string;
  storagePathPrefix?: string;
}

export function ImageUpload({
  value,
  onChange,
  label = 'Image',
  placeholder = 'https://... or /products/...',
  storagePathPrefix = 'admin_upload',
}: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setProgress(5);
    setError(null);

    try {
      const url = await uploadImageFile(file, storagePathPrefix, false, (p) => setProgress(p));
      onChange(url);
    } catch (err: any) {
      setError(describeUploadError(err));
    } finally {
      setIsUploading(false);
      setProgress(0);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="space-y-2">
      {label && <label className="block text-sm font-medium text-brand-gray-700">{label}</label>}
      <div className="flex items-start gap-3">
        <div className="w-20 h-20 rounded-xl border border-brand-gray-200 bg-brand-gray-50 flex items-center justify-center overflow-hidden shrink-0">
          {value ? (
            <img
              src={value}
              alt={label}
              className="w-full h-full object-contain"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          ) : (
            <ImageIcon className="w-6 h-6 text-brand-gray-400" />
          )}
        </div>
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={value || ''}
              onChange={(e) => onChange(e.target.value)}
              placeholder={placeholder}
              className="flex-1 px-3 py-2 text-sm border border-brand-gray-300 rounded-lg focus:outline-none focus:border-brand-black"
            />
            {value && (
              <button
                type="button"
                onClick={() => onChange('')}
                className="p-2 text-brand-gray-400 hover:text-red-600 rounded-lg border border-brand-gray-200"
                title="Clear image"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
            <button
              type="button"
              disabled={isUploading}
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-gray-100 hover:bg-brand-gray-200 text-xs font-medium text-brand-black transition-colors disabled:opacity-50"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Uploading ({progress}%)
                </>
              ) : (
                <>
                  <UploadCloud className="w-3.5 h-3.5" />
                  Upload File
                </>
              )}
            </button>
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>
      </div>
    </div>
  );
}
