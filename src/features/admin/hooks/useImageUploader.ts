import { storage, auth } from '../../../services/firebase';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { getAdminAuthHeaders } from '../../../utils/adminAuth';
import { isSupabaseConfigured, uploadToSupabaseStorage } from '../../../services/supabase';

export async function validateAndProcessFile(file: File, circular: boolean): Promise<{ blob: Blob; dataUrl: string }> {
  const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (!validTypes.includes(file.type)) {
    throw new Error('Please upload a valid image (PNG, JPG, JPEG, or WebP)');
  }
  if (file.size > 10 * 1024 * 1024) {
    throw new Error('File size must be less than 10MB');
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const rawDataUrl = e.target?.result as string;
      if (!rawDataUrl) {
        return reject(new Error('Failed to read image file'));
      }

      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (circular) {
          const size = Math.min(width, height);
          canvas.width = 400;
          canvas.height = 400;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            const offsetX = (width - size) / 2;
            const offsetY = (height - size) / 2;
            ctx.drawImage(img, offsetX, offsetY, size, size, 0, 0, 400, 400);
          }
        } else {
          const MAX_DIMENSION = 1000;
          if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
            if (width > height) {
              height = Math.round((height * MAX_DIMENSION) / width);
              width = MAX_DIMENSION;
            } else {
              width = Math.round((width * MAX_DIMENSION) / height);
              height = MAX_DIMENSION;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(img, 0, 0, width, height);
          }
        }

        const outputType = 'image/jpeg';
        const quality = 0.85;
        const compressedDataUrl = canvas.toDataURL(outputType, quality);

        try {
          canvas.toBlob((blob) => {
            resolve({ blob: blob || file, dataUrl: compressedDataUrl });
          }, outputType, quality);
        } catch {
          resolve({ blob: file, dataUrl: compressedDataUrl });
        }
      };
      img.onerror = () => reject(new Error('Invalid image file'));
      img.src = rawDataUrl;
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

export async function uploadImageFile(
  file: File,
  storagePath: string,
  circular: boolean,
  onProgress: (pct: number) => void
): Promise<string> {
  const { blob, dataUrl } = await validateAndProcessFile(file, circular);
  onProgress(35);

  // 1. Primary: Upload to server's /api/admin/upload (which writes to Supabase Storage / /public/uploads)
  try {
    const headers = await getAdminAuthHeaders(true);
    onProgress(65);
    const res = await fetch('/api/admin/upload', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        base64: dataUrl,
        mimeType: 'image/jpeg',
        storagePath,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.success && data.url) {
      onProgress(100);
      return data.url;
    }
  } catch (serverErr) {
    console.warn('Server upload fallback triggered:', serverErr);
  }

  // 2. Direct Supabase Storage fallback when configured on client
  if (isSupabaseConfigured) {
    try {
      const supaRes = await uploadToSupabaseStorage(blob, storagePath, blob.type || 'image/jpeg');
      if (supaRes.url) {
        onProgress(100);
        return supaRes.url;
      }
    } catch (supaErr) {
      console.warn('Supabase Storage upload fallback triggered:', supaErr);
    }
  }

  // 3. Tertiary: Try Firebase Storage if signed in
  if (auth.currentUser) {
    try {
      const fileExt = 'jpg';
      const safeStoragePath = storagePath.replace(/[^a-zA-Z0-9_-]+/g, '_').slice(0, 80) || 'image';
      const randomId = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
      const objectPath = `uploads/${safeStoragePath}_${randomId}.${fileExt}`;
      const storageRef = ref(storage, objectPath);

      const url = await new Promise<string>((resolve, reject) => {
        const task = uploadBytesResumable(storageRef, blob, { contentType: blob.type || 'image/jpeg' });
        const timeoutId = setTimeout(() => {
          task.cancel();
          reject(new Error('Storage upload timed out'));
        }, 12000);

        task.on(
          'state_changed',
          (snapshot) => {
            const pct = snapshot.totalBytes
              ? Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 80) + 20
              : 50;
            onProgress(Math.min(pct, 99));
          },
          (err) => {
            clearTimeout(timeoutId);
            reject(err);
          },
          async () => {
            clearTimeout(timeoutId);
            try {
              const downloadUrl = await getDownloadURL(task.snapshot.ref);
              resolve(downloadUrl);
            } catch (e) {
              reject(e);
            }
          }
        );
      });
      return url;
    } catch (storageErr) {
      console.warn('Firebase Storage fallback to dataUrl:', storageErr);
    }
  }

  onProgress(100);
  return dataUrl;
}

export function describeUploadError(uploadError: any): string {
  return uploadError?.message || 'Failed to upload image. Please check your connection and try again.';
}
