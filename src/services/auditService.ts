import { getAdminAuthHeaders } from '../utils/adminAuth';
import { fetchJsonWithProxyRetry } from '../utils/apiFetch';
import { auth } from './firebase';
import type { OrderAuditLogEntry, OrderAuditIntegrityReport } from '../types';

export type AuditLogCategory = 'USERS' | 'SETTINGS' | 'BILLING' | 'ORDERS' | 'SYSTEM' | 'DELIVERY';

export interface AuditLogEntry {
  id: string;
  action: string;
  category: AuditLogCategory | string;
  actor: string;
  actorRole?: string;
  orderId?: string;
  eventType?: string;
  previousStatus?: string | null;
  newStatus?: string | null;
  previousPaymentStatus?: string | null;
  newPaymentStatus?: string | null;
  source?: string;
  previousHash?: string;
  integrityHash?: string;
  changes?: Record<string, { from: any; to: any }>;
  details: string;
  createdAt: any;
}

export async function logAuditEvent(
  action: string,
  category: AuditLogCategory,
  details: string
) {
  try {
    const headers = await getAdminAuthHeaders(true);
    await fetchJsonWithProxyRetry('/api/admin/audit-log', {
      method: 'POST',
      headers,
      body: JSON.stringify({ action, category, details }),
    });
  } catch (err) {
    console.warn('Could not write audit log:', err);
  }
}

export async function fetchOrderAuditLogs(orderId: string, isAdmin = true): Promise<{
  logs: OrderAuditLogEntry[];
  integrity: OrderAuditIntegrityReport | null;
}> {
  let headers: Record<string, string> = {};
  if (isAdmin) {
    headers = await getAdminAuthHeaders();
  } else if (auth.currentUser) {
    const token = await auth.currentUser.getIdToken();
    if (token) headers = { Authorization: `Bearer ${token}` };
  }
  const endpoint = isAdmin
    ? `/api/admin/orders/${encodeURIComponent(orderId)}/audit-logs`
    : `/api/orders/${encodeURIComponent(orderId)}/audit-logs`;
  const { res, data } = await fetchJsonWithProxyRetry(endpoint, {
    headers,
  });
  if (!res.ok || !data?.success) {
    throw new Error(data?.error || 'Failed to load order audit trail');
  }
  const rawIntegrity = data.integrity || null;
  const integrity: OrderAuditIntegrityReport | null = rawIntegrity
    ? {
        ...rawIntegrity,
        entryCount: rawIntegrity.entryCount ?? rawIntegrity.totalEvents ?? 0,
        headHash: rawIntegrity.headHash ?? rawIntegrity.lastAuditHash ?? null,
        tamperReason:
          rawIntegrity.tamperReason ??
          (Array.isArray(rawIntegrity.mismatchDetails) && rawIntegrity.mismatchDetails.length > 0
            ? rawIntegrity.mismatchDetails.join('; ')
            : null),
      }
    : null;
  return {
    logs: Array.isArray(data.logs) ? data.logs : [],
    integrity,
  };
}

