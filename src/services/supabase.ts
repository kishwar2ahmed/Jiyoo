/**
 * JIYOO – Reusable Browser/Client Supabase SDK Integration
 *
 * Uses the official `@supabase/supabase-js` library with public environment
 * variables (`VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`).
 * NEVER uses or exposes `service_role` or secret keys in frontend code.
 * Gracefully degrades when Supabase environment variables are not configured.
 */

import { createClient, SupabaseClient, User as SupabaseUser, Session } from '@supabase/supabase-js';
import { fetchJsonWithProxyRetry } from '../utils/apiFetch';

const getEnvVar = (key: string): string => {
  try {
    if (typeof import.meta !== 'undefined' && import.meta.env && key in import.meta.env) {
      return String(import.meta.env[key] || '').trim();
    }
  } catch {
    // ignore
  }
  if (typeof process !== 'undefined' && process.env && key in process.env) {
    return String(process.env[key] || '').trim();
  }
  return '';
};

const rawSupabaseUrl = getEnvVar('VITE_SUPABASE_URL').replace(/\/+$/, '');
const rawSupabaseAnonKey = getEnvVar('VITE_SUPABASE_ANON_KEY');
export const SUPABASE_STORAGE_BUCKET =
  getEnvVar('VITE_SUPABASE_STORAGE_BUCKET') || 'jiyoo-media';

export const isSupabaseConfigured = Boolean(
  rawSupabaseUrl &&
    rawSupabaseAnonKey &&
    rawSupabaseUrl.startsWith('http') &&
    !rawSupabaseUrl.includes('your-project-ref.supabase.co') &&
    rawSupabaseAnonKey !== 'your-supabase-anon-public-key'
);

let supabaseClientInstance: SupabaseClient | null = null;

/**
 * Returns a singleton `@supabase/supabase-js` client when configured, or `null`
 * if `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` are not set.
 */
export function getSupabaseClient(): SupabaseClient | null {
  if (!isSupabaseConfigured) return null;
  if (!supabaseClientInstance) {
    supabaseClientInstance = createClient(rawSupabaseUrl, rawSupabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: 'jiyoo_supabase_auth_token',
      },
    });
  }
  return supabaseClientInstance;
}

export const supabase = getSupabaseClient();

// ============================================================================
// 1. SUPABASE DATABASE CRUD OPERATIONS (Client-Side with Graceful Error Handling)
// ============================================================================

export interface SupabaseCrudResult<T> {
  data: T | null;
  error: string | null;
}

export async function supabaseFetchTable<T = Record<string, any>>(
  tableName: string,
  options?: {
    column?: string;
    value?: string | number | boolean;
    orderBy?: { column: string; ascending?: boolean };
    limit?: number;
  }
): Promise<SupabaseCrudResult<T[]>> {
  const client = getSupabaseClient();
  if (!client) {
    return { data: null, error: 'Supabase client is not configured' };
  }

  try {
    let queryBuilder = client.from(tableName).select('*');
    if (options?.column && options.value !== undefined) {
      queryBuilder = queryBuilder.eq(options.column, options.value);
    }
    if (options?.orderBy) {
      queryBuilder = queryBuilder.order(options.orderBy.column, {
        ascending: options.orderBy.ascending ?? false,
      });
    }
    if (typeof options?.limit === 'number' && options.limit > 0) {
      queryBuilder = queryBuilder.limit(options.limit);
    }

    const { data, error } = await queryBuilder;
    if (error) {
      return { data: null, error: error.message };
    }
    return { data: (data as T[]) || [], error: null };
  } catch (err: any) {
    return { data: null, error: err?.message || 'Failed to query Supabase table' };
  }
}

export async function supabaseFetchCollectionDocs<T = Record<string, any>>(
  collectionName: string,
  limitCount = 500
): Promise<SupabaseCrudResult<T[]>> {
  const client = getSupabaseClient();
  if (!client) {
    return { data: null, error: 'Supabase client is not configured' };
  }

  try {
    const { data, error } = await client
      .from('jiyoo_documents')
      .select('doc_id, data, updated_at')
      .eq('collection', collectionName)
      .limit(limitCount);

    if (error) {
      return { data: null, error: error.message };
    }

    const mapped: T[] = (data || [])
      .filter((row: any) => row && row.doc_id && row.data && typeof row.data === 'object')
      .map((row: any) => ({
        ...(row.data as Record<string, any>),
        id: String(row.doc_id),
      })) as T[];

    return { data: mapped, error: null };
  } catch (err: any) {
    return { data: null, error: err?.message || 'Failed to fetch collection documents from Supabase' };
  }
}

export async function supabaseUpsertRecord<T extends Record<string, any>>(
  tableName: string,
  record: T,
  onConflict = 'id'
): Promise<SupabaseCrudResult<T>> {
  const client = getSupabaseClient();
  if (!client) {
    return { data: null, error: 'Supabase client is not configured' };
  }

  try {
    const { data, error } = await client
      .from(tableName)
      .upsert(record, { onConflict })
      .select()
      .maybeSingle();

    if (error) {
      return { data: null, error: error.message };
    }
    return { data: (data as T) || record, error: null };
  } catch (err: any) {
    return { data: null, error: err?.message || 'Failed to upsert record in Supabase' };
  }
}

export async function supabaseUpdateRecord<T extends Record<string, any>>(
  tableName: string,
  id: string,
  updates: Partial<T>,
  idColumn = 'id'
): Promise<SupabaseCrudResult<T>> {
  const client = getSupabaseClient();
  if (!client) {
    return { data: null, error: 'Supabase client is not configured' };
  }

  try {
    const { data, error } = await client
      .from(tableName)
      .update(updates as Record<string, any>)
      .eq(idColumn, id)
      .select()
      .maybeSingle();

    if (error) {
      return { data: null, error: error.message };
    }
    return { data: (data as T) || null, error: null };
  } catch (err: any) {
    return { data: null, error: err?.message || 'Failed to update record in Supabase' };
  }
}

export async function supabaseDeleteRecord(
  tableName: string,
  id: string,
  idColumn = 'id'
): Promise<{ success: boolean; error: string | null }> {
  const client = getSupabaseClient();
  if (!client) {
    return { success: false, error: 'Supabase client is not configured' };
  }

  try {
    const { error } = await client.from(tableName).delete().eq(idColumn, id);
    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true, error: null };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to delete record from Supabase' };
  }
}

const RELATIONAL_SUPABASE_TABLES = new Set([
  'products',
  'categories',
  'orders',
  'users',
  'reviews',
  'coupons',
  'settings',
  'audit_logs',
]);

export async function supabaseDeleteCollectionDoc(
  collectionName: string,
  docId: string
): Promise<{ success: boolean; error: string | null }> {
  const client = getSupabaseClient();
  if (!client) {
    return { success: false, error: 'Supabase client is not configured' };
  }

  try {
    const { error } = await client
      .from('jiyoo_documents')
      .delete()
      .eq('collection', collectionName)
      .eq('doc_id', docId);

    if (RELATIONAL_SUPABASE_TABLES.has(collectionName)) {
      await client.from(collectionName).delete().eq('id', docId);
    }

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true, error: null };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Failed to delete collection document from Supabase',
    };
  }
}

// ============================================================================
// 2. SUPABASE AUTHENTICATION HELPERS
// ============================================================================

export async function supabaseSignInWithEmail(
  email: string,
  password: string
): Promise<{ user: SupabaseUser | null; session: Session | null; error: string | null }> {
  const client = getSupabaseClient();
  if (!client) {
    return { user: null, session: null, error: 'Supabase Auth is not configured' };
  }
  try {
    const { data, error } = await client.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (error) {
      return { user: null, session: null, error: error.message };
    }
    return { user: data.user, session: data.session, error: null };
  } catch (err: any) {
    return { user: null, session: null, error: err?.message || 'Supabase sign-in failed' };
  }
}

export async function supabaseSignUpWithEmail(
  email: string,
  password: string,
  fullName?: string
): Promise<{ user: SupabaseUser | null; session: Session | null; error: string | null }> {
  const client = getSupabaseClient();
  if (!client) {
    return { user: null, session: null, error: 'Supabase Auth is not configured' };
  }
  try {
    const { data, error } = await client.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: fullName ? { full_name: fullName.trim(), name: fullName.trim() } : undefined,
      },
    });
    if (error) {
      return { user: null, session: null, error: error.message };
    }
    return { user: data.user, session: data.session, error: null };
  } catch (err: any) {
    return { user: null, session: null, error: err?.message || 'Supabase sign-up failed' };
  }
}

export async function supabaseSendPasswordReset(
  email: string
): Promise<{ success: boolean; error: string | null }> {
  const client = getSupabaseClient();
  if (!client) {
    return { success: false, error: 'Supabase Auth is not configured' };
  }
  try {
    const redirectTo =
      typeof window !== 'undefined' ? `${window.location.origin}/` : undefined;
    const { error } = await client.auth.resetPasswordForEmail(email.trim(), {
      redirectTo,
    });
    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true, error: null };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Supabase password reset failed' };
  }
}

export async function supabaseSignOut(): Promise<void> {
  const client = getSupabaseClient();
  if (!client) return;
  try {
    await client.auth.signOut();
  } catch {
    // ignore sign-out error
  }
}

export async function getSupabaseAccessToken(): Promise<string | null> {
  const client = getSupabaseClient();
  if (!client) return null;
  try {
    const { data } = await client.auth.getSession();
    return data.session?.access_token || null;
  } catch {
    return null;
  }
}

// ============================================================================
// 3. SUPABASE STORAGE HELPERS (File & Image Uploads)
// ============================================================================

export async function uploadToSupabaseStorage(
  fileOrBlob: File | Blob,
  storagePath: string,
  contentType = 'image/jpeg'
): Promise<{ url: string | null; path: string | null; error: string | null }> {
  const client = getSupabaseClient();
  if (!client) {
    return { url: null, path: null, error: 'Supabase Storage is not configured' };
  }

  try {
    const ext = contentType === 'image/png' ? 'png' : contentType === 'image/webp' ? 'webp' : 'jpg';
    const safePrefix =
      String(storagePath || 'upload')
        .replace(/[^a-zA-Z0-9_-]+/g, '_')
        .slice(0, 60) || 'upload';
    const uniqueSuffix =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    const objectPath = `uploads/${safePrefix}_${uniqueSuffix}.${ext}`;

    const { error: uploadError } = await client.storage
      .from(SUPABASE_STORAGE_BUCKET)
      .upload(objectPath, fileOrBlob, {
        contentType,
        cacheControl: '31536000',
        upsert: true,
      });

    if (uploadError) {
      return { url: null, path: null, error: uploadError.message };
    }

    const { data } = client.storage.from(SUPABASE_STORAGE_BUCKET).getPublicUrl(objectPath);
    return {
      url: data?.publicUrl || null,
      path: objectPath,
      error: null,
    };
  } catch (err: any) {
    return {
      url: null,
      path: null,
      error: err?.message || 'Supabase Storage upload failed',
    };
  }
}

// ============================================================================
// 4. SUPABASE & BACKEND CONNECTIVITY PING UTILITY
// ============================================================================

export interface SupabaseConnectionHealth {
  backendConnected: boolean;
  supabaseConfigured: boolean;
  supabaseConnected: boolean;
  latencyMs: number | null;
  mode: 'service_role' | 'anon' | 'client_anon' | 'fallback';
  urlHost: string | null;
  checkedAt: string;
  error?: string;
}

/**
 * Pings the backend `/api/admin/supabase/status` endpoint and/or the direct
 * `@supabase/supabase-js` client to verify live database and backend connectivity.
 */
export async function pingSupabaseConnection(
  authHeaders?: Record<string, string>
): Promise<SupabaseConnectionHealth> {
  const startMs = Date.now();
  const checkedAt = new Date().toISOString();

  // 1. Check backend server & server-side Supabase connection first
  try {
    const { res, data } = await fetchJsonWithProxyRetry('/api/admin/supabase/status', {
      method: 'GET',
      headers: authHeaders || {},
    });
    if (res.ok) {
      if (data && data.success) {
        if (data.connected) {
          return {
            backendConnected: true,
            supabaseConfigured: true,
            supabaseConnected: true,
            latencyMs:
              typeof data.latencyMs === 'number'
                ? data.latencyMs
                : Math.max(1, Date.now() - startMs),
            mode: data.mode === 'service_role' ? 'service_role' : 'anon',
            urlHost: data.urlHost || null,
            checkedAt,
          };
        }

        // If server is reachable but server-side Supabase isn't configured, try client-side Supabase if configured
        if (!isSupabaseConfigured) {
          return {
            backendConnected: true,
            supabaseConfigured: Boolean(data.configured),
            supabaseConnected: false,
            latencyMs: Math.max(1, Date.now() - startMs),
            mode: 'fallback',
            urlHost: data.urlHost || null,
            checkedAt,
            error: data.error,
          };
        }
      }
    }
  } catch {
    // Backend unreachable; fall through to client-side check
  }

  // 2. Direct browser-side Supabase ping if configured via VITE_SUPABASE_URL
  const client = getSupabaseClient();
  if (client && isSupabaseConfigured) {
    const clientStart = Date.now();
    try {
      const { error } = await client
        .from('jiyoo_documents')
        .select('doc_id', { head: true })
        .limit(1);
      const latencyMs = Math.max(1, Date.now() - clientStart);
      let urlHost: string | null = null;
      try {
        urlHost = new URL(rawSupabaseUrl).host;
      } catch {
        urlHost = null;
      }
      if (!error) {
        return {
          backendConnected: true,
          supabaseConfigured: true,
          supabaseConnected: true,
          latencyMs,
          mode: 'client_anon',
          urlHost,
          checkedAt,
        };
      }
      return {
        backendConnected: false,
        supabaseConfigured: true,
        supabaseConnected: false,
        latencyMs,
        mode: 'client_anon',
        urlHost,
        checkedAt,
        error: error.message,
      };
    } catch (err: any) {
      return {
        backendConnected: false,
        supabaseConfigured: true,
        supabaseConnected: false,
        latencyMs: Math.max(1, Date.now() - clientStart),
        mode: 'client_anon',
        urlHost: null,
        checkedAt,
        error: err?.message || 'Supabase client ping failed',
      };
    }
  }

  return {
    backendConnected: false,
    supabaseConfigured: false,
    supabaseConnected: false,
    latencyMs: null,
    mode: 'fallback',
    urlHost: null,
    checkedAt,
    error: 'Backend server unreachable',
  };
}
