import { useState, useRef } from 'react';
import { Loader2, X, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { uploadImageFile, describeUploadError } from '../hooks/useImageUploader';

interface MultiImageUploadProps {
  label: string;
  value: string[];
  onChange: (urls: string[]) => void;
  storagePath: string;
  max?: number;
}

export function MultiImageUpload({ label, value, onChange, storagePath, max = 6 }: MultiImageUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const remaining = max - value.length;
  const canAddMore = remaining > 0;

  const handleFiles = async (files: FileList | File[]) => {
    setError(null);
    const list = Array.from(files).slice(0, remaining);
    if (list.length === 0) return;
    if (files.length > remaining) {
      setError(`Only ${remaining} more image${remaining === 1 ? '' : 's'} can be added (max ${max}).`);
    }

    setIsUploading(true);
    const uploaded: string[] = [];
    try {
      for (let i = 0; i < list.length; i++) {
        setProgress(0);
        const url = await uploadImageFile(list[i], storagePath, false, setProgress);
        uploaded.push(url);
      }
      onChange([...value, ...uploaded]);
    } catch (uploadError: any) {
      console.error('Gallery upload error:', uploadError);
      setError(describeUploadError(uploadError));
      // Keep whatever succeeded before the failure rather than losing all of it.
      if (uploaded.length > 0) onChange([...value, ...uploaded]);
    } finally {
      setIsUploading(false);
      setProgress(0);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files?.length) await handleFiles(e.dataTransfer.files);
  };

  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) await handleFiles(e.target.files);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRemove = (idx: number) => {
    onChange(value.filter((_, i) => i !== idx));
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-brand-gray-700">
        {label} <span className="text-brand-gray-400 font-normal">({value.length}/{max})</span>
      </label>

      <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
        <AnimatePresence>
          {value.map((url, idx) => (
            <motion.div
              key={url + idx}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="relative group aspect-square rounded-xl overflow-hidden border border-brand-gray-200 bg-brand-gray-50"
            >
              <img src={url} alt={`${label} ${idx + 1}`} className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => handleRemove(idx)}
                className="absolute top-1.5 right-1.5 p-1.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                title="Remove"
              >
                <X className="w-3 h-3" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>

        {canAddMore && (
          <div
            onClick={() => !isUploading && fileInputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            className={`relative aspect-square rounded-xl border-2 border-dashed cursor-pointer flex flex-col items-center justify-center text-center px-2 transition-colors ${
              isDragging ? 'border-emerald-500 bg-emerald-50/50' : 'border-brand-gray-200 hover:border-brand-gray-300 hover:bg-brand-gray-50/50'
            } ${isUploading ? 'pointer-events-none' : ''}`}
          >
            {isUploading ? (
              <div className="flex flex-col items-center gap-2 w-full px-3">
                <Loader2 className="w-5 h-5 text-emerald-600 animate-spin" />
                <div className="w-full bg-brand-gray-200 rounded-full h-1 overflow-hidden">
                  <div className="bg-emerald-600 h-full transition-all duration-300" style={{ width: `${progress}%` }} />
                </div>
              </div>
            ) : (
              <>
                <Plus className="w-5 h-5 text-brand-gray-400 mb-1" />
                <span className="text-[11px] text-brand-gray-500">Add photo</span>
              </>
            )}
          </div>
        )}
      </div>

      {error && (
        <p className="text-sm text-red-500 mt-1 flex items-center gap-1.5">
          <X className="w-3.5 h-3.5 shrink-0" /> {error}
        </p>
      )}

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileInput}
        accept="image/png, image/jpeg, image/jpg, image/webp"
        multiple
        className="hidden"
      />
    </div>
  );
}
