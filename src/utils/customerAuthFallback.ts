import { AuthUser } from '../types';
import { OWNER_ADMIN_EMAILS } from './adminAuth';
import { fetchJsonWithProxyRetry } from './apiFetch';

const CUSTOMER_SESSION_STORAGE_KEY = 'jiyoo_customer_session_v1';

export interface CustomerSessionPayload {
  token: string;
  user: AuthUser;
  expiresAt: string;
}

export function getStoredCustomerSession(): CustomerSessionPayload | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw =
      localStorage.getItem(CUSTOMER_SESSION_STORAGE_KEY) ||
      sessionStorage.getItem(CUSTOMER_SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CustomerSessionPayload;
    if (!parsed || !parsed.token || !parsed.user?.id || !parsed.user?.email) {
      return null;
    }
    if (parsed.expiresAt && Date.now() > new Date(parsed.expiresAt).getTime()) {
      clearStoredCustomerSession();
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function saveStoredCustomerSession(
  payload: CustomerSessionPayload,
  rememberMe = true
): void {
  if (typeof window === 'undefined') return;
  try {
    const serialized = JSON.stringify(payload);
    if (rememberMe) {
      localStorage.setItem(CUSTOMER_SESSION_STORAGE_KEY, serialized);
      sessionStorage.removeItem(CUSTOMER_SESSION_STORAGE_KEY);
    } else {
      sessionStorage.setItem(CUSTOMER_SESSION_STORAGE_KEY, serialized);
      localStorage.removeItem(CUSTOMER_SESSION_STORAGE_KEY);
    }
    window.dispatchEvent(new CustomEvent('jiyoo-customer-auth-changed', { detail: payload.user }));
  } catch {
    // ignore storage quota errors
  }
}

export function updateStoredCustomerUser(patch: Partial<AuthUser>): AuthUser | null {
  if (typeof window === 'undefined') return null;
  try {
    const current = getStoredCustomerSession();
    if (!current) return null;
    const isRemembered = Boolean(localStorage.getItem(CUSTOMER_SESSION_STORAGE_KEY));
    const nextUser: AuthUser = {
      ...current.user,
      ...patch,
      ...(patch.name ? { displayName: patch.name } : {}),
    };
    saveStoredCustomerSession(
      {
        ...current,
        user: nextUser,
      },
      isRemembered
    );
    return nextUser;
  } catch {
    return null;
  }
}

export function clearStoredCustomerSession(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(CUSTOMER_SESSION_STORAGE_KEY);
    sessionStorage.removeItem(CUSTOMER_SESSION_STORAGE_KEY);
    window.dispatchEvent(new CustomEvent('jiyoo-customer-auth-changed', { detail: null }));
  } catch {
    // ignore
  }
}

export async function serverCustomerSignUp(
  name: string,
  email: string,
  password: string,
  rememberMe = true
): Promise<{ success: boolean; user?: AuthUser; error?: string }> {
  try {
    const { res, data } = await fetchJsonWithProxyRetry('/api/customer-auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim(), email: email.trim(), password }),
    });
    if (res.ok && data?.success && data?.user && data?.token) {
      const emailLower = String(data.user.email || '').trim().toLowerCase();
      const isAdmin = Boolean(data.user.admin || OWNER_ADMIN_EMAILS.has(emailLower));
      const authUser: AuthUser = {
        id: String(data.user.id),
        email: emailLower,
        name: String(data.user.name || name.trim()),
        displayName: String(data.user.name || name.trim()),
        role: isAdmin ? 'admin' : 'customer',
        admin: isAdmin,
      };
      saveStoredCustomerSession(
        {
          token: String(data.token),
          user: authUser,
          expiresAt:
            data.expiresAt || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        },
        rememberMe
      );
      return { success: true, user: authUser };
    }
    return {
      success: false,
      error: data?.error || 'Could not create account.',
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Network error while creating account.',
    };
  }
}

export async function serverCustomerSignIn(
  email: string,
  password: string,
  rememberMe = true
): Promise<{ success: boolean; user?: AuthUser; error?: string }> {
  try {
    const { res, data } = await fetchJsonWithProxyRetry('/api/customer-auth/signin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim(), password }),
    });
    if (res.ok && data?.success && data?.user && data?.token) {
      const emailLower = String(data.user.email || '').trim().toLowerCase();
      const isAdmin = Boolean(data.user.admin || OWNER_ADMIN_EMAILS.has(emailLower));
      const authUser: AuthUser = {
        id: String(data.user.id),
        email: emailLower,
        name: String(data.user.name || emailLower.split('@')[0] || 'Customer'),
        displayName: String(data.user.name || emailLower.split('@')[0] || 'Customer'),
        ...(data.user.phone ? { phone: String(data.user.phone) } : {}),
        ...(data.user.picture ? { picture: String(data.user.picture) } : {}),
        role: isAdmin ? 'admin' : 'customer',
        admin: isAdmin,
      };
      saveStoredCustomerSession(
        {
          token: String(data.token),
          user: authUser,
          expiresAt:
            data.expiresAt || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        },
        rememberMe
      );
      return { success: true, user: authUser };
    }
    return {
      success: false,
      error: data?.error || 'Invalid email or password.',
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Network error while signing in.',
    };
  }
}
