import { useState, useEffect, useCallback } from 'react';
import { AuthUser } from '../../../types';
import { Search, Trash2, Check } from 'lucide-react';
import { useToast } from '../../core/contexts/ToastContext';
import { useConfirm } from '../../core/contexts/ConfirmContext';
import { getAdminAuthHeaders } from '../../../utils/adminAuth';

export function UsersTab() {
  const { showToast } = useToast();
  const confirm = useConfirm();
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const loadUsers = useCallback(async () => {
    try {
      const headers = await getAdminAuthHeaders();
      const res = await fetch('/api/admin/users', { headers });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success && Array.isArray(data.users)) {
        setUsers(data.users);
      }
    } catch (err) {
      console.error('Error loading users:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const updateRole = async (id: string, newRole: string) => {
    try {
      const headers = await getAdminAuthHeaders(true);
      const res = await fetch(`/api/admin/users/${id}/role`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ role: newRole }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to update role');
      }
      setUsers(prev => prev.map(u => u.id === id ? { ...u, role: newRole } : u));
      showToast(`User role updated to ${newRole}`, 'success');
    } catch (err: any) {
      console.error("Error updating role", err);
      showToast(err.message || "Failed to update role", "error");
    }
  };

  const removeUser = async (userToRemove: AuthUser) => {
    if (!(await confirm({
      title: "Remove user?",
      message: `Are you sure you want to remove user ${userToRemove.name || userToRemove.email}? This action cannot be undone.`,
    }))) {
      return;
    }
    try {
      const headers = await getAdminAuthHeaders(true);
      const res = await fetch(`/api/admin/users/${userToRemove.id}/delete`, {
        method: 'POST',
        headers,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to remove user');
      }
      setUsers(prev => prev.filter(u => u.id !== userToRemove.id));
      showToast(`User ${userToRemove.name || userToRemove.email} removed successfully.`, "success");
    } catch (err: any) {
      console.error("Error removing user", err);
      showToast(err.message || "Failed to remove user", "error");
    }
  };

  const filteredUsers = users.filter(u => 
    u.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-brand-black">User Management</h2>
          <p className="text-brand-gray-500">View team members, manage permissions, or revoke access.</p>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-brand-gray-200 space-y-4">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-gray-400" />
          <input 
            type="text"
            placeholder="Search users by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-brand-gray-50 border border-brand-gray-200 rounded-lg outline-none focus:border-emerald-600 text-sm"
          />
        </div>

        {loading ? (
          <div className="py-12 text-center text-brand-gray-500">Loading user accounts...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-brand-gray-500 uppercase bg-brand-gray-50">
                <tr>
                  <th className="px-4 py-3 rounded-tl-lg">User</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 rounded-tr-lg text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-gray-100">
                {filteredUsers.map(u => (
                  <tr key={u.id} className="hover:bg-brand-gray-50/80 transition-colors">
                    <td className="px-4 py-3 flex items-center gap-3">
                      {u.picture ? (
                        <img src={u.picture} alt={u.name} className="w-8 h-8 rounded-full border border-brand-gray-200 shrink-0" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-brand-black text-white flex items-center justify-center text-xs font-bold shrink-0">
                          {u.name?.slice(0, 2).toUpperCase() || 'U'}
                        </div>
                      )}
                      <div>
                        <span className="font-medium text-brand-black block">{u.name || 'Unnamed User'}</span>
                        <span className="text-[10px] text-brand-gray-400 font-mono">ID: {u.id.slice(0, 10)}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-brand-gray-600 font-mono text-xs">{u.email}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2.5 py-1 rounded-md text-xs font-semibold ${
                        u.role === 'admin' 
                          ? 'bg-amber-100 text-amber-900 border border-amber-300' 
                          : 'bg-stone-100 text-stone-700'
                      }`}>
                        {u.role || 'user'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full uppercase">
                        <Check className="w-3 h-3 text-emerald-600" /> Active
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <select 
                          value={u.role || 'user'}
                          onChange={async (e) => {
                            const newRole = e.target.value;
                            if (newRole === 'admin') {
                              if (await confirm({ title: "Promote to admin?", message: `Promote ${u.name || u.email} to Admin?`, danger: false, confirmLabel: "Promote" })) {
                                updateRole(u.id, newRole);
                              }
                            } else {
                              updateRole(u.id, newRole);
                            }
                          }}
                          className="bg-brand-gray-50 border border-brand-gray-200 text-brand-black text-xs rounded-lg focus:ring-emerald-600 focus:border-emerald-600 p-1.5"
                        >
                          <option value="user">User</option>
                          <option value="admin">Admin</option>
                        </select>

                        <button 
                          onClick={() => removeUser(u)}
                          title="Remove Member"
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
