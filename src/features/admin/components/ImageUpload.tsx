import { useState, useRef } from 'react';
import { UploadCloud, Loader2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { uploadImageFile, describeUploadError } from '../hooks/useImageUploader';
import { useConfirm } from '../../core/contexts/ConfirmContext';

interface ImageUploadProps {
  label: string;
  value: string | null;
  defaultImage?: string;
  onChange: (url: string | null) => void;
  circular?: boolean;
  storagePath: string; // 'brand', 'qr-codes' etc.
}

export function ImageUpload({ label, value, defaultImage, onChange, circular = false, storagePath }: ImageUploadProps) {
  const confirm = useConfirm();
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const displayImage = value || defaultImage || null;

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) await handleFileUpload(file);
  };

  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) await handleFileUpload(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleFileUpload = async (file: File) => {
    setError(null);
    setIsUploading(true);
    setProgress(10);

    try {
      const url = await uploadImageFile(file, storagePath, circular, setProgress);
      setProgress(100);
      onChange(url);
    } catch (uploadError: any) {
      console.error('Upload error:', uploadError);
      setError(describeUploadError(uploadError));
    } finally {
      setTimeout(() => {
        setIsUploading(false);
        setProgress(0);
      }, 400);
    }
  };

  const handleRemove = async () => {
    if (await confirm({ title: "Remove image?", message: "Are you sure you want to remove this image?" })) {
      onChange(null);
    }
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-brand-gray-700">{label}</label>
      
      <AnimatePresence mode="wait">
        {displayImage ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="relative group w-full"
          >
            <div className={`relative overflow-hidden border border-brand-gray-200 bg-brand-gray-50 flex items-center justify-center ${circular ? 'w-32 h-32 rounded-full mx-auto' : 'w-full h-48 rounded-xl'}`}>
              <img src={displayImage} alt={label} className="w-full h-full object-contain p-2" />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3 backdrop-blur-sm">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2 bg-white text-brand-black rounded-full hover:bg-brand-gray-100 transition-colors shadow-sm"
                  title="Replace Image"
                >
                  <UploadCloud className="w-4 h-4" />
                </button>
                {value && (
                  <button
                    type="button"
                    onClick={handleRemove}
                    className="p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors shadow-sm"
                    title="Remove Image"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            onClick={() => !isUploading && fileInputRef.current?.click()}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`relative border-2 border-dashed rounded-xl transition-all duration-200 cursor-pointer overflow-hidden flex flex-col items-center justify-center text-center px-6 ${circular ? 'w-32 h-32 mx-auto rounded-full' : 'h-48'} ${
              isDragging ? 'border-emerald-500 bg-emerald-50/50' : 'border-brand-gray-200 hover:border-brand-gray-300 hover:bg-brand-gray-50/50'
            } ${isUploading ? 'pointer-events-none' : ''}`}
          >
            {isUploading ? (
              <div className="flex flex-col items-center gap-3 w-full max-w-[200px]">
                <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
                <div className="w-full bg-brand-gray-200 rounded-full h-1.5 overflow-hidden">
                  <div 
                    className="bg-emerald-600 h-full transition-all duration-300 ease-out" 
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <span className="text-xs font-medium text-brand-gray-600">{Math.round(progress)}%</span>
              </div>
            ) : (
              <>
                <div className="w-10 h-10 rounded-full bg-brand-gray-100 flex items-center justify-center mb-3 text-brand-gray-500">
                  <UploadCloud className="w-5 h-5" />
                </div>
                {!circular && (
                  <>
                    <p className="text-sm font-medium text-brand-gray-800 mb-1">Click or drag image to upload</p>
                    <p className="text-xs text-brand-gray-500">PNG, JPG or WebP (max 10MB)</p>
                  </>
                )}
                {circular && (
                  <p className="text-xs text-brand-gray-500 text-center">Upload<br/>Image</p>
                )}
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {error && (
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm text-red-500 mt-2 flex items-center gap-1.5">
          <X className="w-3.5 h-3.5 shrink-0" /> {error}
        </motion.p>
      )}

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileInput}
        accept="image/png, image/jpeg, image/jpg, image/webp"
        className="hidden"
      />
    </div>
  );
}
