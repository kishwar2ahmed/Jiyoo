import { auth, db } from '../services/firebase';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';

export const OWNER_ADMIN_EMAILS = new Set([
  'yoyokishwar@gmail.com',
  'shamsjiyoo@gmail.com',
  'jiyooshams@gmail.com',
  'syedshams7799@gmail.com',
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
}): Promise<AdminPrimaryAuthResponse> {
  try {
    const bodyPayload: Record<string, string> = {};
    if (options?.ownerPin) {
      bodyPayload.ownerPin = options.ownerPin;
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
    const data: AdminPrimaryAuthResponse = await res.json().catch(() => ({
      success: false,
      error: 'Unexpected response from authentication server.',
    }));
    if (res.ok && data.success && typeof data.token === 'string' && data.mfaVerified) {
      storeAdminSignedToken(data.token);
    }
    return data;
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
    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        clearAdminSession();
      }
      return null;
    }
    const data = await res.json().catch(() => null);
    return data && data.success && data.mfaVerified ? (data as AdminSecurityStatus) : null;
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

export async function exchangeFirebaseTokenForAdminSession(): Promise<string | null> {
  return getStoredAdminSignedToken();
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

export async function adminSaveDoc(col: string, id: string, data: Record<string, any>): Promise<void> {
  const headers = await getAdminAuthHeaders(true);
  const res = await fetch(`/api/admin/collection/${encodeURIComponent(col)}/${encodeURIComponent(id)}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(data),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body.success) {
    throw new Error(body.error || 'Failed to save document');
  }
  // Only mirror to client-side Firestore if the user is signed into Firebase Auth with an owner admin email
  if (auth.currentUser && auth.currentUser.emailVerified && isOwnerAdminEmail(auth.currentUser.email)) {
    try {
      await setDoc(doc(db, col, id), data, { merge: true });
    } catch {
      // Server write already succeeded; ignore optional client-side mirror error
    }
  }
}

export async function adminDeleteDoc(col: string, id: string): Promise<void> {
  const headers = await getAdminAuthHeaders();
  const res = await fetch(`/api/admin/collection/${encodeURIComponent(col)}/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers,
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body.success) {
    throw new Error(body.error || 'Failed to delete document');
  }
  if (auth.currentUser && auth.currentUser.emailVerified && isOwnerAdminEmail(auth.currentUser.email)) {
    try {
      await deleteDoc(doc(db, col, id));
    } catch {
      // Server delete already succeeded; ignore optional client-side mirror error
    }
  }
}

export async function adminFetchCollection<T = any>(col: string): Promise<T[]> {
  try {
    const headers = await getAdminAuthHeaders();
    const res = await fetch(`/api/admin/collection/${encodeURIComponent(col)}`, { headers });
    const body = await res.json().catch(() => ({}));
    if (res.ok && body.success && Array.isArray(body.items)) {
      return body.items as T[];
    }
  } catch {
    // ignore
  }
  return [];
}


