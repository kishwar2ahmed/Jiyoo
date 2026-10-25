import { useState, useEffect } from 'react';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../../../services/firebase';
import { AuditLogEntry } from '../../../services/auditService';
import { ShieldAlert, Search, Filter, Clock, UserCheck, Settings, AlertTriangle, CreditCard, Users, ShoppingCart } from 'lucide-react';
import { format } from 'date-fns';

export function AuditLogTab() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCategory, setFilterCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'audit_logs'), orderBy('createdAt', 'desc'), limit(150));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const loaded: AuditLogEntry[] = [];
        snap.forEach(docSnap => {
          loaded.push({ id: docSnap.id, ...docSnap.data() } as AuditLogEntry);
        });
        setLogs(loaded);
        setLoading(false);
      },
      (err) => {
        console.warn('Error fetching audit logs:', err);
        setLogs([]);
        setLoading(false);
      }
    );
    return () => unsub();
  }, []);

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'USERS': return <Users className="w-4 h-4 text-purple-600" />;
      case 'SETTINGS': return <Settings className="w-4 h-4 text-blue-600" />;
      case 'BILLING': return <CreditCard className="w-4 h-4 text-emerald-600" />;
      case 'ORDERS': return <ShoppingCart className="w-4 h-4 text-amber-600" />;
      case 'DANGER_ZONE': return <AlertTriangle className="w-4 h-4 text-red-600" />;
      default: return <UserCheck className="w-4 h-4 text-gray-600" />;
    }
  };

  const filteredLogs = logs.filter(log => {
    const matchesCategory = filterCategory === 'ALL' || log.category === filterCategory;
    const matchesSearch = 
      log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.actor.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.details.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-brand-black flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-emerald-600" />
            Audit Log
          </h2>
          <p className="text-brand-gray-500">Immutable history of administrative and system-level workspace actions.</p>
        </div>

        <div className="flex items-center gap-2 bg-emerald-50 text-emerald-800 text-xs px-3 py-1.5 rounded-full border border-emerald-200 font-mono font-medium">
          <Clock className="w-3.5 h-3.5 text-emerald-600" />
          Live Audit Logging Active
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-brand-gray-200 space-y-4">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-gray-400" />
            <input 
              type="text"
              placeholder="Search audit trail..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-brand-gray-50 border border-brand-gray-200 rounded-lg outline-none focus:border-emerald-600 text-sm"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
            <Filter className="w-4 h-4 text-brand-gray-400 shrink-0" />
            {['ALL', 'USERS', 'SETTINGS', 'BILLING', 'ORDERS', 'SYSTEM'].map(cat => (
              <button
                key={cat}
                onClick={() => setFilterCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors shrink-0 ${
                  filterCategory === cat
                    ? 'bg-brand-black text-white'
                    : 'bg-brand-gray-100 text-brand-gray-600 hover:bg-brand-gray-200'
                }`}
              >
                {cat.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="py-12 text-center text-brand-gray-500">Loading security logs...</div>
        ) : filteredLogs.length === 0 ? (
          <div className="py-12 text-center text-brand-gray-400">
            No audit records matching criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-brand-gray-500 uppercase bg-brand-gray-50">
                <tr>
                  <th className="px-4 py-3 rounded-tl-lg">Action</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Actor</th>
                  <th className="px-4 py-3">Details</th>
                  <th className="px-4 py-3 rounded-tr-lg">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-gray-100">
                {filteredLogs.map((log, index) => {
                  let formattedTime = 'Just now';
                  if (log.createdAt?.seconds) {
                    formattedTime = format(new Date(log.createdAt.seconds * 1000), 'MMM dd, yyyy · HH:mm:ss');
                  } else if (typeof log.createdAt === 'string') {
                    formattedTime = format(new Date(log.createdAt), 'MMM dd, yyyy · HH:mm:ss');
                  }

                  return (
                    <tr key={log.id || index} className="hover:bg-brand-gray-50/80 transition-colors">
                      <td className="px-4 py-3 font-semibold text-brand-black font-mono text-xs">
                        {log.action}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase bg-brand-gray-100 text-brand-black">
                          {getCategoryIcon(log.category)}
                          {log.category}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-brand-gray-700 font-medium text-xs">
                        {log.actor}
                      </td>
                      <td className="px-4 py-3 text-brand-gray-600 text-xs max-w-xs truncate">
                        {log.details}
                      </td>
                      <td className="px-4 py-3 text-brand-gray-400 font-mono text-[11px] whitespace-nowrap">
                        {formattedTime}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
