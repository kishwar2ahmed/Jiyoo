import { auth, db } from '../services/firebase';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';
import {
  isSupabaseConfigured,
  supabaseUpsertRecord,
  supabaseDeleteCollectionDoc,
  supabaseFetchCollectionDocs,
} from '../services/supabase';

export const OWNER_ADMIN_EMAILS = new Set([
  'yoyokishwar@gmail.com',
  'shamsjiyoo@gmail.com',
  'jiyooshams@gmail.com',
  'syedshams7799@gmail.com',
  'kishwar.ahmed.vr@gmail.com',
]);

const ADMIN_SIGNED_TOKEN_KEY = 'jiyoo_admin_signed_token';

export interface Admin2FAEnrollmentPayload {
  secret: string;
  otpauthUrl: string;
  qrCodeDataUrl: string;
  issuer: string;
  account: string;
}

export interface AdminPrimaryAuthResponse {
  success: boolean;
  requires2FA?: boolean;
  totpEnrolled?: boolean;
  preAuthToken?: string;
  email?: string;
  remainingRecoveryCodes?: number;
  enrollment?: Admin2FAEnrollmentPayload;
  token?: string;
  mfaVerified?: boolean;
  code?: string;
  remainingAttempts?: number;
  retryAfterSeconds?: number;
  error?: string;
}

export interface AdminSecurityStatus {
  success: boolean;
  email: string;
  mfaVerified: boolean;
  totpEnabled: boolean;
  enrolledAt: string | null;
  lastVerifiedAt: string | null;
  remainingRecoveryCodes: number;
  sessionExpiresAt: string | null;
  securityPolicy?: {
    authRateLimit: string;
    twoFactorRateLimit: string;
    apiRateLimit: string;
    bruteForceLockout: string;
    totpStandard: string;
  };
}

export function isOwnerAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  return OWNER_ADMIN_EMAILS.has(email.trim().toLowerCase());
}

export function getStoredAdminSignedToken(): string | null {
  try {
    const t = sessionStorage.getItem(ADMIN_SIGNED_TOKEN_KEY);
    return t && t.startsWith('jiyoo_admin_sig.') ? t : null;
  } catch {
    return null;
  }
}

export function storeAdminSignedToken(token: string): void {
  try {
    if (token && token.startsWith('jiyoo_admin_sig.')) {
      sessionStorage.setItem(ADMIN_SIGNED_TOKEN_KEY, token);
    }
  } catch {
    // ignore storage errors
  }
}

export function clearAdminSession(): void {
  try {
    sessionStorage.removeItem(ADMIN_SIGNED_TOKEN_KEY);
    sessionStorage.removeItem('jiyoo_admin_unlocked');
  } catch {
    // ignore storage errors
  }
}

export async function initiateAdminPrimaryAuth(options?: {
  ownerPin?: string;
  identifier?: string;
  password?: string;
}): Promise<AdminPrimaryAuthResponse> {
  try {
    const bodyPayload: Record<string, string> = {};
    if (options?.ownerPin) {
      bodyPayload.ownerPin = options.ownerPin;
    } else if (options?.identifier && options?.password) {
      bodyPayload.identifier = options.identifier;
      bodyPayload.password = options.password;
    } else if (auth.currentUser) {
      bodyPayload.idToken = await auth.currentUser.getIdToken(true);
    } else {
      return { success: false, error: 'Please sign in with your administrator account first.' };
    }

    const res = await fetch('/api/admin/auth/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bodyPayload),
    });
    const rawText = await res.text();

    if (res.ok && rawText) {
      try {
        const data = JSON.parse(rawText) as AdminPrimaryAuthResponse;
        if (data.success && typeof data.token === 'string' && data.mfaVerified) {
          storeAdminSignedToken(data.token);
        }
        return data;
      } catch {
        // non-JSON
      }
    }

    if (rawText) {
      try {
        const errData = JSON.parse(rawText) as AdminPrimaryAuthResponse;
        if (errData && errData.error) {
          return errData;
        }
      } catch {
        // non-JSON
      }
    }

    return {
      success: false,
      error: 'Unexpected response from authentication server. Please check your connection and credentials.',
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Network error while verifying administrator credentials.',
    };
  }
}

export async function verifyAdmin2FAEnrollment(
  preAuthToken: string,
  code: string
): Promise<{
  success: boolean;
  token?: string;
  email?: string;
  recoveryCodes?: string[];
  remainingAttempts?: number;
  retryAfterSeconds?: number;
  error?: string;
}> {
  try {
    const res = await fetch('/api/admin/auth/2fa/enroll-verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ preAuthToken, code }),
    });
    const data = await res.json().catch(() => ({ success: false, error: 'Failed to verify 2FA enrollment.' }));
    if (res.ok && data.success && typeof data.token === 'string') {
      storeAdminSignedToken(data.token);
    }
    return data;
  } catch (err: any) {
    return { success: false, error: err?.message || 'Network error during 2FA enrollment.' };
  }
}

export async function verifyAdmin2FAChallenge(
  preAuthToken: string,
  code: string,
  useRecoveryCode = false
): Promise<{
  success: boolean;
  token?: string;
  email?: string;
  verifiedVia?: 'TOTP' | 'RECOVERY_CODE';
  remainingRecoveryCodes?: number;
  remainingAttempts?: number;
  retryAfterSeconds?: number;
  error?: string;
}> {
  try {
    const res = await fetch('/api/admin/auth/2fa/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ preAuthToken, code, useRecoveryCode }),
    });
    const data = await res.json().catch(() => ({ success: false, error: 'Failed to verify 2FA code.' }));
    if (res.ok && data.success && typeof data.token === 'string') {
      storeAdminSignedToken(data.token);
    }
    return data;
  } catch (err: any) {
    return { success: false, error: err?.message || 'Network error during 2FA verification.' };
  }
}

export async function fetchAdminSecurityStatus(): Promise<AdminSecurityStatus | null> {
  try {
    const token = getStoredAdminSignedToken();
    if (!token) return null;

    const res = await fetch('/api/admin/auth/status', {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (res.ok) {
      const data = await res.json().catch(() => null);
      if (data && data.success && data.mfaVerified) {
        return data as AdminSecurityStatus;
      }
    }

    if (res.status === 401 || res.status === 403) {
      clearAdminSession();
      return null;
    }

    return null;
  } catch {
    return null;
  }
}

export async function regenerateAdminRecoveryCodes(code: string): Promise<{
  success: boolean;
  recoveryCodes?: string[];
  remainingRecoveryCodes?: number;
  error?: string;
}> {
  try {
    const headers = await getAdminAuthHeaders(true);
    const res = await fetch('/api/admin/auth/2fa/regenerate-recovery', {
      method: 'POST',
      headers,
      body: JSON.stringify({ code }),
    });
    return await res.json().catch(() => ({ success: false, error: 'Failed to regenerate recovery codes.' }));
  } catch (err: any) {
    return { success: false, error: err?.message || 'Network error' };
  }
}

export async function logoutAdminSession(): Promise<void> {
  try {
    const token = getStoredAdminSignedToken();
    if (token) {
      await fetch('/api/admin/auth/logout', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {});
    }
  } finally {
    clearAdminSession();
  }
}

export async function getAdminAuthHeaders(includeJsonContentType = false): Promise<Record<string, string>> {
  const token: string | null = getStoredAdminSignedToken();

  const headers: Record<string, string> = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  if (includeJsonContentType) {
    headers['Content-Type'] = 'application/json';
  }

  return headers;
}

function readLocalAdminCollectionMap(col: string): Record<string, any> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(`jiyoo_admin_col_${col}`);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function writeLocalAdminCollectionMap(col: string, mapObj: Record<string, any>): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(`jiyoo_admin_col_${col}`, JSON.stringify(mapObj));
    window.dispatchEvent(new CustomEvent('jiyoo-admin-collection-updated', { detail: { col } }));
  } catch {
    // ignore storage quota errors
  }
}

export async function adminSaveDoc(col: string, id: string, data: Record<string, any>): Promise<void> {
  const now = new Date().toISOString();
  const payload = {
    ...data,
    id,
    ...(col === 'products' ? { adminEdited: true } : {}),
    updatedAt: data.updatedAt || now,
  };

  const localMap = readLocalAdminCollectionMap(col);
  const existing = localMap[id] || {};
  const merged = { ...existing, ...payload };
  delete merged.__deleted;
  localMap[id] = merged;
  writeLocalAdminCollectionMap(col, localMap);

  try {
    const headers = await getAdminAuthHeaders(true);
    await fetch(`/api/admin/collection/${encodeURIComponent(col)}/${encodeURIComponent(id)}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
  } catch {
    // Local persistence already succeeded
  }

  if (isSupabaseConfigured) {
    supabaseUpsertRecord(
      'jiyoo_documents',
      {
        collection: col,
        doc_id: id,
        data: payload,
        updated_at: now,
      },
      'collection,doc_id'
    ).catch(() => {});
  }

  if (auth.currentUser && auth.currentUser.emailVerified && isOwnerAdminEmail(auth.currentUser.email)) {
    try {
      await setDoc(doc(db, col, id), payload, { merge: true });
    } catch {
      // Server/local write already succeeded
    }
  }
}

export async function adminDeleteDoc(col: string, id: string): Promise<void> {
  const localMap = readLocalAdminCollectionMap(col);
  localMap[id] = { id, __deleted: true, isDeleted: true, updatedAt: new Date().toISOString() };
  writeLocalAdminCollectionMap(col, localMap);

  try {
    const headers = await getAdminAuthHeaders();
    await fetch(`/api/admin/collection/${encodeURIComponent(col)}/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers,
    });
  } catch {
    // Local persistence already succeeded
  }

  if (isSupabaseConfigured) {
    supabaseDeleteCollectionDoc(col, id).catch(() => {});
  }

  if (auth.currentUser && auth.currentUser.emailVerified && isOwnerAdminEmail(auth.currentUser.email)) {
    try {
      await deleteDoc(doc(db, col, id));
    } catch {
      // Server/local delete already succeeded
    }
  }
}

export async function adminFetchCollection<T = any>(col: string): Promise<T[]> {
  const mergedMap = new Map<string, any>();
  const localMap = readLocalAdminCollectionMap(col);

  try {
    const headers = await getAdminAuthHeaders();
    const res = await fetch(`/api/admin/collection/${encodeURIComponent(col)}`, { headers });
    const body = await res.json().catch(() => ({}));
    if (res.ok && body.success && Array.isArray(body.items)) {
      for (const item of body.items) {
        if (item && typeof item === 'object' && item.id) {
          mergedMap.set(String(item.id), item);
        }
      }
    }
  } catch {
    // ignore network error and use local mirror
  }

  if (mergedMap.size === 0 && isSupabaseConfigured) {
    try {
      const supaRes = await supabaseFetchCollectionDocs<any>(col);
      for (const item of supaRes.data || []) {
        if (item && typeof item === 'object' && item.id) {
          mergedMap.set(String(item.id), item);
        }
      }
    } catch {
      // ignore Supabase fallback error
    }
  }

  for (const [id, item] of Object.entries(localMap)) {
    if (!item || typeof item !== 'object') continue;
    if (item.__deleted === true) {
      mergedMap.delete(id);
    } else {
      const base = mergedMap.get(id) || {};
      mergedMap.set(id, { ...base, ...item, id });
    }
  }

  return Array.from(mergedMap.values()) as T[];
}

export function getLocalAdminCollectionOverrides(col: string): Array<Record<string, any>> {
  const localMap = readLocalAdminCollectionMap(col);
  return Object.entries(localMap).map(([id, item]) => ({ ...(item || {}), id }));
}
