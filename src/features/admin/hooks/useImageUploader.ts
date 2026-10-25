import { storage, auth } from '../../../services/firebase';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';

export async function validateAndProcessFile(file: File, circular: boolean): Promise<{ blob: Blob }> {
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

        try {
          canvas.toBlob((blob) => {
            resolve({ blob: blob || file });
          }, outputType, quality);
        } catch (e) {
          resolve({ blob: file });
        }
      };
      img.onerror = () => reject(new Error('Invalid image file'));
      img.src = rawDataUrl;
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

/**
 * Uploads a single (already-processed) file to Firebase Storage under uploads/,
 * reporting progress via onProgress (20-99) and resolving with the download URL.
 * Times out after 30s so a stalled/CORS-blocked request surfaces a clear error
 * instead of spinning forever.
 */
export async function uploadImageFile(
  file: File,
  storagePath: string,
  circular: boolean,
  onProgress: (pct: number) => void
): Promise<string> {
  const { blob } = await validateAndProcessFile(file, circular);
  onProgress(20);

  if (!auth.currentUser) {
    throw new Error('You must be signed in as an admin to upload images.');
  }

  const fileExt = 'jpg';
  const safeStoragePath = storagePath.replace(/[^a-zA-Z0-9_-]+/g, '_').slice(0, 80) || 'image';
  const randomId = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  const objectPath = `uploads/${safeStoragePath}_${randomId}.${fileExt}`;
  const storageRef = ref(storage, objectPath);

  return new Promise((resolve, reject) => {
    const task = uploadBytesResumable(storageRef, blob, { contentType: blob.type || 'image/jpeg' });

    const timeoutId = setTimeout(() => {
      task.cancel();
      reject(new Error('Upload timed out after 30s. This usually means Firebase Storage is rejecting the request from this domain (CORS) -- check the browser console for a CORS error, and that this domain is allowed in your Storage CORS config.'));
    }, 30000);

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
          const url = await getDownloadURL(task.snapshot.ref);
          resolve(url);
        } catch (e) {
          reject(e);
        }
      }
    );
  });
}

export function describeUploadError(uploadError: any): string {
  let message = uploadError.message || 'Failed to upload image. Please check your connection and try again.';
  if (uploadError.code === 'storage/unauthorized') {
    message = 'Permission denied by Firebase Storage rules. Make sure you are logged in as an admin and that storage.rules has actually been deployed (firebase deploy --only storage).';
  } else if (uploadError.code === 'storage/unknown' || uploadError.message?.includes('CORS')) {
    message = 'Upload blocked, likely by CORS. If you recently changed domains, add the new domain to your Firebase Storage bucket CORS config.';
  }
  return message;
}
