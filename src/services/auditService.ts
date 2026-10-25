import { auth } from './firebase';

export type AuditLogCategory = 'USERS' | 'SETTINGS' | 'BILLING' | 'ORDERS' | 'SYSTEM';

export interface AuditLogEntry {
  id: string;
  action: string;
  category: AuditLogCategory | string;
  actor: string;
  details: string;
  createdAt: any;
}

// Audit logs are server-controlled and append-only: firestore.rules deny ALL
// direct client writes to audit_logs, so this posts to a requireAuth +
// requireAdmin server endpoint instead. The server derives "actor" from the
// caller's verified ID token, never from anything sent here, so a client can
// never fabricate who performed an action -- there is no actor parameter here.
export async function logAuditEvent(
  action: string,
  category: AuditLogCategory,
  details: string
) {
  try {
    const token = await auth.currentUser?.getIdToken();
    if (!token) return;
    await fetch('/api/admin/audit-log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ action, category, details }),
    });
  } catch (err) {
    console.warn('Could not write audit log:', err);
  }
}
