import { useState, useEffect, useCallback } from 'react';
import { auth } from '../../../services/firebase';
import { useToast } from '../../core/contexts/ToastContext';
import { useConfirm } from '../../core/contexts/ConfirmContext';
import { MapPin, Truck, Plus, Trash2, Search, Upload, Download, RefreshCw, X } from 'lucide-react';

interface PincodeRow {
  pincode: string;
  label?: string;
  enabled: boolean;
  deliveryFee?: number;
  minOrderAmount?: number;
}

interface ZoneRow {
  id: string;
  label: string;
  pincodePrefixes: string[];
  enabled: boolean;
  shippingFee: number;
  minOrderValue: number;
  etaDays?: string;
}

async function authedFetch(path: string, body?: any) {
  const token = await auth.currentUser?.getIdToken();
  if (!token) throw new Error('Not signed in');
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.success) throw new Error(data.error || 'Request failed');
  return data;
}

async function authedGet(path: string) {
  const token = await auth.currentUser?.getIdToken();
  if (!token) throw new Error('Not signed in');
  const res = await fetch(path, { headers: { Authorization: `Bearer ${token}` } });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.success) throw new Error(data.error || 'Request failed');
  return data;
}

export function DeliveryManagementTab() {
  const { showToast } = useToast();
  const confirm = useConfirm();

  const [section, setSection] = useState<'retail' | 'wholesale'>('retail');

  // --- Retail PIN codes ---
  const [pincodes, setPincodes] = useState<PincodeRow[]>([]);
  const [loadingPincodes, setLoadingPincodes] = useState(true);
  const [pincodeSearch, setPincodeSearch] = useState('');
  const [pincodeFilter, setPincodeFilter] = useState<'all' | 'enabled' | 'disabled'>('all');
  const [newPincode, setNewPincode] = useState('');
  const [newPincodeLabel, setNewPincodeLabel] = useState('');
  const [bulkText, setBulkText] = useState('');
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [busy, setBusy] = useState(false);

  const loadPincodes = useCallback(async () => {
    setLoadingPincodes(true);
    try {
      const data = await authedGet('/api/admin/delivery/pincodes');
      setPincodes(data.pincodes || []);
    } catch (err: any) {
      showToast(err.message || 'Failed to load PIN codes', 'error');
    } finally {
      setLoadingPincodes(false);
    }
  }, [showToast]);

  // --- Wholesale zones ---
  const [zones, setZones] = useState<ZoneRow[]>([]);
  const [loadingZones, setLoadingZones] = useState(true);
  const [showZoneForm, setShowZoneForm] = useState(false);
  const [zoneDraft, setZoneDraft] = useState<Partial<ZoneRow>>({ pincodePrefixes: [], enabled: true });

  const loadZones = useCallback(async () => {
    setLoadingZones(true);
    try {
      const data = await authedGet('/api/admin/wholesale/zones');
      setZones(data.zones || []);
    } catch (err: any) {
      showToast(err.message || 'Failed to load wholesale zones', 'error');
    } finally {
      setLoadingZones(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadPincodes();
    loadZones();
  }, [loadPincodes, loadZones]);

  const handleSeedCandidates = async () => {
    setBusy(true);
    try {
      const data = await authedFetch('/api/admin/delivery/pincodes/seed-candidates');
      showToast(`Seeded ${data.added} candidate PIN code(s) (added disabled -- review and enable).`, 'success');
      await loadPincodes();
    } catch (err: any) {
      showToast(err.message || 'Failed to seed candidates', 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleAddPincode = async () => {
    if (!/^\d{6}$/.test(newPincode)) {
      showToast('Enter a valid 6-digit PIN code', 'error');
      return;
    }
    setBusy(true);
    try {
      await authedFetch('/api/admin/delivery/pincodes', { pincode: newPincode, label: newPincodeLabel, enabled: false });
      showToast(`PIN code ${newPincode} added (disabled by default).`, 'success');
      setNewPincode('');
      setNewPincodeLabel('');
      await loadPincodes();
    } catch (err: any) {
      showToast(err.message || 'Failed to add PIN code', 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleToggleEnabled = async (p: PincodeRow) => {
    const prev = pincodes;
    setPincodes(pincodes.map((row) => row.pincode === p.pincode ? { ...row, enabled: !row.enabled } : row));
    try {
      await authedFetch(`/api/admin/delivery/pincodes/${p.pincode}`, { enabled: !p.enabled });
    } catch (err: any) {
      setPincodes(prev);
      showToast(err.message || 'Failed to update PIN code', 'error');
    }
  };

  const handleRemovePincode = async (pincode: string) => {
    if (!(await confirm({ title: 'Remove PIN code?', message: `Remove ${pincode} from serviceable PIN codes? Existing confirmed orders are not affected.` }))) return;
    try {
      await authedFetch(`/api/admin/delivery/pincodes/${pincode}/delete`);
      setPincodes((prev) => prev.filter((p) => p.pincode !== pincode));
      showToast(`PIN code ${pincode} removed.`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to remove PIN code', 'error');
    }
  };

  const handleBulkImport = async () => {
    const lines = bulkText.split(/[\n,]/).map((l) => l.trim()).filter(Boolean);
    const entries = lines.map((line) => {
      const [pin, ...rest] = line.split(/[\t|]/).map((s) => s.trim());
      return { pincode: pin, label: rest.join(' ') || undefined, enabled: false };
    }).filter((e) => /^\d{6}$/.test(e.pincode));
    if (entries.length === 0) {
      showToast('No valid 6-digit PIN codes found in the pasted list.', 'error');
      return;
    }
    setBusy(true);
    try {
      const data = await authedFetch('/api/admin/delivery/pincodes/bulk-import', { pincodes: entries });
      showToast(`Imported ${data.added} new PIN code(s), skipped ${data.skipped} duplicate(s).`, 'success');
      setBulkText('');
      setShowBulkImport(false);
      await loadPincodes();
    } catch (err: any) {
      showToast(err.message || 'Bulk import failed', 'error');
    } finally {
      setBusy(false);
    }
  };

  const filteredPincodes = pincodes.filter((p) => {
    if (pincodeFilter === 'enabled' && !p.enabled) return false;
    if (pincodeFilter === 'disabled' && p.enabled) return false;
    if (pincodeSearch && !p.pincode.includes(pincodeSearch) && !(p.label || '').toLowerCase().includes(pincodeSearch.toLowerCase())) return false;
    return true;
  });

  const handleSaveZone = async () => {
    if (!zoneDraft.label || !zoneDraft.pincodePrefixes?.length) {
      showToast('Zone needs a label and at least one 3-digit PIN prefix.', 'error');
      return;
    }
    setBusy(true);
    try {
      const payload = {
        label: zoneDraft.label,
        pincodePrefixes: zoneDraft.pincodePrefixes,
        enabled: zoneDraft.enabled ?? true,
        shippingFee: Number(zoneDraft.shippingFee) || 0,
        minOrderValue: Number(zoneDraft.minOrderValue) || 0,
        etaDays: zoneDraft.etaDays || undefined,
      };
      if (zoneDraft.id) {
        await authedFetch(`/api/admin/wholesale/zones/${zoneDraft.id}`, payload);
        showToast('Wholesale zone updated.', 'success');
      } else {
        await authedFetch('/api/admin/wholesale/zones', payload);
        showToast('Wholesale zone created.', 'success');
      }
      setShowZoneForm(false);
      setZoneDraft({ pincodePrefixes: [], enabled: true });
      await loadZones();
    } catch (err: any) {
      showToast(err.message || 'Failed to save wholesale zone', 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleToggleZone = async (z: ZoneRow) => {
    const prev = zones;
    setZones(zones.map((row) => row.id === z.id ? { ...row, enabled: !row.enabled } : row));
    try {
      await authedFetch(`/api/admin/wholesale/zones/${z.id}`, { enabled: !z.enabled });
    } catch (err: any) {
      setZones(prev);
      showToast(err.message || 'Failed to update zone', 'error');
    }
  };

  const handleDeleteZone = async (id: string) => {
    if (!(await confirm({ title: 'Delete wholesale zone?', message: 'This will stop wholesale checkout from accepting PIN codes in this zone.' }))) return;
    try {
      await authedFetch(`/api/admin/wholesale/zones/${id}/delete`);
      setZones((prev) => prev.filter((z) => z.id !== id));
      showToast('Wholesale zone deleted.', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to delete zone', 'error');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-brand-black">Delivery Management</h2>
        <p className="text-brand-gray-500">Retail PIN code serviceability and wholesale shipping zones.</p>
      </div>

      <div className="flex gap-2 border-b border-brand-gray-200">
        <button
          onClick={() => setSection('retail')}
          className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${section === 'retail' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-brand-gray-500 hover:text-brand-gray-800'}`}
        >
          <MapPin className="w-4 h-4 inline mr-1.5" /> Retail PIN Codes
        </button>
        <button
          onClick={() => setSection('wholesale')}
          className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${section === 'wholesale' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-brand-gray-500 hover:text-brand-gray-800'}`}
        >
          <Truck className="w-4 h-4 inline mr-1.5" /> Wholesale Zones
        </button>
      </div>

      {section === 'retail' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-brand-gray-400" />
              <input
                value={pincodeSearch}
                onChange={(e) => setPincodeSearch(e.target.value)}
                placeholder="Search PIN or label..."
                className="w-full pl-9 pr-3 py-2 bg-brand-gray-50 border border-brand-gray-200 rounded-lg text-sm outline-none focus:border-emerald-600"
              />
            </div>
            <select
              value={pincodeFilter}
              onChange={(e) => setPincodeFilter(e.target.value as any)}
              className="px-3 py-2 bg-brand-gray-50 border border-brand-gray-200 rounded-lg text-sm outline-none"
            >
              <option value="all">All</option>
              <option value="enabled">Enabled</option>
              <option value="disabled">Disabled</option>
            </select>
            <button onClick={() => loadPincodes()} className="p-2 text-brand-gray-500 hover:bg-brand-gray-100 rounded-lg">
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={() => setShowBulkImport((s) => !s)}
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold bg-brand-gray-100 hover:bg-brand-gray-200 rounded-lg"
            >
              <Upload className="w-4 h-4" /> Bulk Import
            </button>
            <button
              onClick={handleSeedCandidates}
              disabled={busy}
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold bg-brand-gray-100 hover:bg-brand-gray-200 rounded-lg disabled:opacity-50"
            >
              <Download className="w-4 h-4" /> Seed Candidate PINs
            </button>
          </div>

          {showBulkImport && (
            <div className="border border-brand-gray-200 rounded-lg p-4 bg-brand-gray-50 space-y-2">
              <p className="text-xs text-brand-gray-500">One PIN code per line (optionally "PINCODE, Label"). All imported as disabled -- review and enable after verifying serviceability.</p>
              <textarea
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
                rows={5}
                placeholder={"560001, Bangalore GPO\n560002\n560003, Malleshwaram"}
                className="w-full px-3 py-2 border border-brand-gray-200 rounded-lg text-sm font-mono outline-none focus:border-emerald-600"
              />
              <div className="flex gap-2">
                <button onClick={handleBulkImport} disabled={busy} className="px-4 py-2 text-sm font-semibold bg-brand-black text-white rounded-lg disabled:opacity-50">
                  Import
                </button>
                <button onClick={() => setShowBulkImport(false)} className="px-4 py-2 text-sm font-semibold text-brand-gray-600 hover:bg-brand-gray-100 rounded-lg">
                  Cancel
                </button>
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-end gap-2 border border-brand-gray-200 rounded-lg p-4">
            <div>
              <label className="block text-xs font-medium text-brand-gray-600 mb-1">PIN Code</label>
              <input
                value={newPincode}
                onChange={(e) => setNewPincode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="560001"
                className="w-32 px-3 py-2 border border-brand-gray-200 rounded-lg text-sm outline-none focus:border-emerald-600"
              />
            </div>
            <div className="flex-1 min-w-[160px]">
              <label className="block text-xs font-medium text-brand-gray-600 mb-1">Label (optional)</label>
              <input
                value={newPincodeLabel}
                onChange={(e) => setNewPincodeLabel(e.target.value)}
                placeholder="Area name"
                className="w-full px-3 py-2 border border-brand-gray-200 rounded-lg text-sm outline-none focus:border-emerald-600"
              />
            </div>
            <button onClick={handleAddPincode} disabled={busy} className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg disabled:opacity-50">
              <Plus className="w-4 h-4" /> Add PIN Code
            </button>
          </div>

          <div className="border border-brand-gray-200 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-brand-gray-50 text-left text-brand-gray-500">
                <tr>
                  <th className="px-4 py-3">PIN Code</th>
                  <th className="px-4 py-3">Label</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loadingPincodes ? (
                  <tr><td colSpan={4} className="px-4 py-8 text-center text-brand-gray-500">Loading...</td></tr>
                ) : filteredPincodes.length === 0 ? (
                  <tr><td colSpan={4} className="px-4 py-8 text-center text-brand-gray-500">No PIN codes found.</td></tr>
                ) : filteredPincodes.map((p) => (
                  <tr key={p.pincode} className="border-t border-brand-gray-100">
                    <td className="px-4 py-3 font-mono font-medium">{p.pincode}</td>
                    <td className="px-4 py-3 text-brand-gray-600">{p.label || '—'}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleToggleEnabled(p)}
                        className={`text-xs font-bold px-2.5 py-1 rounded-full border ${p.enabled ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-brand-gray-100 text-brand-gray-500 border-brand-gray-200'}`}
                      >
                        {p.enabled ? 'Enabled' : 'Disabled'}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => handleRemovePincode(p.pincode)} className="text-red-500 hover:bg-red-50 p-2 rounded-lg">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {section === 'wholesale' && (
        <div className="space-y-4">
          <button
            onClick={() => { setZoneDraft({ pincodePrefixes: [], enabled: true }); setShowZoneForm(true); }}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold bg-brand-black text-white rounded-lg"
          >
            <Plus className="w-4 h-4" /> New Shipping Zone
          </button>

          {showZoneForm && (
            <div className="border border-brand-gray-200 rounded-lg p-4 space-y-3 bg-brand-gray-50">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-brand-black">{zoneDraft.id ? 'Edit Zone' : 'New Zone'}</h4>
                <button onClick={() => setShowZoneForm(false)}><X className="w-4 h-4 text-brand-gray-400" /></button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-brand-gray-600 mb-1">Zone Label</label>
                  <input
                    value={zoneDraft.label || ''}
                    onChange={(e) => setZoneDraft((d) => ({ ...d, label: e.target.value }))}
                    placeholder="Karnataka"
                    className="w-full px-3 py-2 border border-brand-gray-200 rounded-lg text-sm outline-none focus:border-emerald-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-brand-gray-600 mb-1">ETA (optional)</label>
                  <input
                    value={zoneDraft.etaDays || ''}
                    onChange={(e) => setZoneDraft((d) => ({ ...d, etaDays: e.target.value }))}
                    placeholder="3-5 days"
                    className="w-full px-3 py-2 border border-brand-gray-200 rounded-lg text-sm outline-none focus:border-emerald-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-brand-gray-600 mb-1">Shipping Fee (₹)</label>
                  <input
                    type="number"
                    value={zoneDraft.shippingFee ?? ''}
                    onChange={(e) => setZoneDraft((d) => ({ ...d, shippingFee: Number(e.target.value) }))}
                    className="w-full px-3 py-2 border border-brand-gray-200 rounded-lg text-sm outline-none focus:border-emerald-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-brand-gray-600 mb-1">Minimum Order Value (₹)</label>
                  <input
                    type="number"
                    value={zoneDraft.minOrderValue ?? ''}
                    onChange={(e) => setZoneDraft((d) => ({ ...d, minOrderValue: Number(e.target.value) }))}
                    className="w-full px-3 py-2 border border-brand-gray-200 rounded-lg text-sm outline-none focus:border-emerald-600"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-brand-gray-600 mb-1">PIN Code Prefixes (3-digit, comma-separated)</label>
                  <input
                    value={(zoneDraft.pincodePrefixes || []).join(', ')}
                    onChange={(e) => setZoneDraft((d) => ({ ...d, pincodePrefixes: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) }))}
                    placeholder="560, 561, 562"
                    className="w-full px-3 py-2 border border-brand-gray-200 rounded-lg text-sm font-mono outline-none focus:border-emerald-600"
                  />
                  <p className="text-[11px] text-brand-gray-500 mt-1">A PIN code is serviceable if its first 3 digits match any prefix here.</p>
                </div>
              </div>
              <button onClick={handleSaveZone} disabled={busy} className="px-4 py-2 text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg disabled:opacity-50">
                Save Zone
              </button>
            </div>
          )}

          <div className="border border-brand-gray-200 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-brand-gray-50 text-left text-brand-gray-500">
                <tr>
                  <th className="px-4 py-3">Zone</th>
                  <th className="px-4 py-3">Prefixes</th>
                  <th className="px-4 py-3">Fee / Min Order</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loadingZones ? (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-brand-gray-500">Loading...</td></tr>
                ) : zones.length === 0 ? (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-brand-gray-500">No wholesale zones configured yet.</td></tr>
                ) : zones.map((z) => (
                  <tr key={z.id} className="border-t border-brand-gray-100">
                    <td className="px-4 py-3 font-medium">{z.label}{z.etaDays ? <span className="block text-xs text-brand-gray-400">{z.etaDays}</span> : null}</td>
                    <td className="px-4 py-3 text-brand-gray-600 font-mono text-xs">{z.pincodePrefixes.join(', ')}</td>
                    <td className="px-4 py-3 text-brand-gray-600">₹{z.shippingFee} / ₹{z.minOrderValue}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleToggleZone(z)}
                        className={`text-xs font-bold px-2.5 py-1 rounded-full border ${z.enabled ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-brand-gray-100 text-brand-gray-500 border-brand-gray-200'}`}
                      >
                        {z.enabled ? 'Enabled' : 'Disabled'}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right flex items-center justify-end gap-1">
                      <button onClick={() => { setZoneDraft(z); setShowZoneForm(true); }} className="text-blue-600 hover:bg-blue-50 p-2 rounded-lg text-xs font-semibold">Edit</button>
                      <button onClick={() => handleDeleteZone(z.id)} className="text-red-500 hover:bg-red-50 p-2 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
