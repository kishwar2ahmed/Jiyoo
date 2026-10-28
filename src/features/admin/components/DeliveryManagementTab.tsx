import { useState, useEffect, useCallback } from 'react';
import { auth } from '../../../services/firebase';
import { useToast } from '../../core/contexts/ToastContext';
import { useConfirm } from '../../core/contexts/ConfirmContext';
import {
  MapPin,
  Truck,
  Plus,
  Trash2,
  Search,
  Upload,
  Download,
  RefreshCw,
  X,
  CheckCircle2,
  Edit3,
  Save,
} from 'lucide-react';
import {
  DEFAULT_RETAIL_AREAS,
  DEFAULT_RETAIL_PINCODES,
  DEFAULT_PAN_INDIA_WHOLESALE_ZONE,
} from '../../../constants/deliveryAreas';

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
  const [pincodes, setPincodes] = useState<PincodeRow[]>(() =>
    Object.values(DEFAULT_RETAIL_PINCODES).map((p) => ({
      pincode: p.pincode,
      label: p.label,
      enabled: p.enabled,
    }))
  );
  const [loadingPincodes, setLoadingPincodes] = useState(true);
  const [pincodeSearch, setPincodeSearch] = useState('');
  const [pincodeFilter, setPincodeFilter] = useState<'all' | 'enabled' | 'disabled'>('all');
  const [newPincode, setNewPincode] = useState('');
  const [newPincodeLabel, setNewPincodeLabel] = useState('');
  const [newPincodeEnabled, setNewPincodeEnabled] = useState(true);
  const [editingPin, setEditingPin] = useState<string | null>(null);
  const [editLabelDraft, setEditLabelDraft] = useState('');
  const [bulkText, setBulkText] = useState('');
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [busy, setBusy] = useState(false);

  const loadPincodes = useCallback(async () => {
    setLoadingPincodes(true);
    try {
      const data = await authedGet('/api/admin/delivery/pincodes');
      if (Array.isArray(data.pincodes) && data.pincodes.length > 0) {
        setPincodes(data.pincodes);
      }
    } catch (err: any) {
      showToast(err.message || 'Loaded default active retail PIN codes', 'error');
    } finally {
      setLoadingPincodes(false);
    }
  }, [showToast]);

  // --- Wholesale zones ---
  const [zones, setZones] = useState<ZoneRow[]>([DEFAULT_PAN_INDIA_WHOLESALE_ZONE]);
  const [loadingZones, setLoadingZones] = useState(true);
  const [showZoneForm, setShowZoneForm] = useState(false);
  const [zoneDraft, setZoneDraft] = useState<Partial<ZoneRow>>({ pincodePrefixes: ['ALL'], enabled: true });

  const loadZones = useCallback(async () => {
    setLoadingZones(true);
    try {
      const data = await authedGet('/api/admin/wholesale/zones');
      if (Array.isArray(data.zones) && data.zones.length > 0) {
        setZones(data.zones);
      }
    } catch (err: any) {
      showToast(err.message || 'Loaded default All-India wholesale zone', 'error');
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
      showToast(
        `Activated 13 Bangalore retail areas (${data.added} added, ${data.updated || 0} synced as active).`,
        'success'
      );
      await loadPincodes();
    } catch (err: any) {
      showToast(err.message || 'Failed to sync default retail areas', 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleAddPincode = async () => {
    const cleanPin = newPincode.replace(/\*+$/, '').trim();
    if (!/^\d{6}$/.test(cleanPin)) {
      showToast('Enter a valid 6-digit PIN code', 'error');
      return;
    }
    setBusy(true);
    try {
      await authedFetch('/api/admin/delivery/pincodes', {
        pincode: cleanPin,
        label: newPincodeLabel.trim(),
        enabled: newPincodeEnabled,
      });
      showToast(
        `PIN code ${cleanPin} added (${newPincodeEnabled ? 'Active' : 'Disabled'}).`,
        'success'
      );
      setNewPincode('');
      setNewPincodeLabel('');
      await loadPincodes();
    } catch (err: any) {
      showToast(err.message || 'Failed to add PIN code', 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleSaveLabelEdit = async (p: PincodeRow) => {
    setBusy(true);
    try {
      await authedFetch(`/api/admin/delivery/pincodes/${p.pincode}`, {
        label: editLabelDraft.trim(),
      });
      setPincodes((prev) =>
        prev.map((row) =>
          row.pincode === p.pincode ? { ...row, label: editLabelDraft.trim() } : row
        )
      );
      setEditingPin(null);
      showToast(`Updated areas for PIN ${p.pincode}.`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to update PIN label', 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleToggleEnabled = async (p: PincodeRow) => {
    const prev = pincodes;
    setPincodes(
      pincodes.map((row) =>
        row.pincode === p.pincode ? { ...row, enabled: !row.enabled } : row
      )
    );
    try {
      await authedFetch(`/api/admin/delivery/pincodes/${p.pincode}`, {
        enabled: !p.enabled,
      });
      showToast(
        `PIN ${p.pincode} is now ${!p.enabled ? 'Enabled' : 'Disabled'}.`,
        'success'
      );
    } catch (err: any) {
      setPincodes(prev);
      showToast(err.message || 'Failed to update PIN code', 'error');
    }
  };

  const handleRemovePincode = async (pincode: string) => {
    if (
      !(await confirm({
        title: 'Remove PIN code?',
        message: `Remove ${pincode} from serviceable PIN codes? Existing confirmed orders are not affected.`,
      }))
    )
      return;
    try {
      await authedFetch(`/api/admin/delivery/pincodes/${pincode}/delete`);
      setPincodes((prev) => prev.filter((p) => p.pincode !== pincode));
      showToast(`PIN code ${pincode} removed.`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to remove PIN code', 'error');
    }
  };

  const handleBulkImport = async () => {
    const lines = bulkText
      .split(/[\n,]/)
      .map((l) => l.trim())
      .filter(Boolean);
    const entries = lines
      .map((line) => {
        const [pin, ...rest] = line.split(/[\t|]/).map((s) => s.trim());
        const cleanPin = (pin || '').replace(/\*+$/, '').trim();
        return {
          pincode: cleanPin,
          label: rest.join(' ') || undefined,
          enabled: true,
        };
      })
      .filter((e) => /^\d{6}$/.test(e.pincode));
    if (entries.length === 0) {
      showToast('No valid 6-digit PIN codes found in the pasted list.', 'error');
      return;
    }
    setBusy(true);
    try {
      const data = await authedFetch('/api/admin/delivery/pincodes/bulk-import', {
        pincodes: entries,
      });
      showToast(
        `Imported ${data.added} new PIN code(s), skipped ${data.skipped} duplicate(s).`,
        'success'
      );
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
    if (
      pincodeSearch &&
      !p.pincode.includes(pincodeSearch) &&
      !(p.label || '').toLowerCase().includes(pincodeSearch.toLowerCase())
    )
      return false;
    return true;
  });

  const handleSaveZone = async () => {
    if (!zoneDraft.label || !zoneDraft.pincodePrefixes?.length) {
      showToast('Zone needs a label and at least one prefix (or ALL for Pan-India).', 'error');
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
      setZoneDraft({ pincodePrefixes: ['ALL'], enabled: true });
      await loadZones();
    } catch (err: any) {
      showToast(err.message || 'Failed to save wholesale zone', 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleToggleZone = async (z: ZoneRow) => {
    const prev = zones;
    setZones(
      zones.map((row) =>
        row.id === z.id ? { ...row, enabled: !row.enabled } : row
      )
    );
    try {
      await authedFetch(`/api/admin/wholesale/zones/${z.id}`, {
        enabled: !z.enabled,
      });
    } catch (err: any) {
      setZones(prev);
      showToast(err.message || 'Failed to update zone', 'error');
    }
  };

  const handleDeleteZone = async (id: string) => {
    if (
      !(await confirm({
        title: 'Delete wholesale zone?',
        message: 'This will remove this custom wholesale zone.',
      }))
    )
      return;
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
        <p className="text-brand-gray-500">
          Manage active retail delivery areas &amp; PIN codes (13 Bangalore localities currently active) and Pan-India wholesale shipping.
        </p>
      </div>

      <div className="flex gap-2 border-b border-brand-gray-200">
        <button
          onClick={() => setSection('retail')}
          className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${
            section === 'retail'
              ? 'border-emerald-600 text-emerald-700'
              : 'border-transparent text-brand-gray-500 hover:text-brand-gray-800'
          }`}
        >
          <MapPin className="w-4 h-4 inline mr-1.5" /> Retail Areas &amp; PIN Codes (13 Active)
        </button>
        <button
          onClick={() => setSection('wholesale')}
          className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${
            section === 'wholesale'
              ? 'border-emerald-600 text-emerald-700'
              : 'border-transparent text-brand-gray-500 hover:text-brand-gray-800'
          }`}
        >
          <Truck className="w-4 h-4 inline mr-1.5" /> Wholesale Zones (All Over India)
        </button>
      </div>

      {section === 'retail' && (
        <div className="space-y-5">
          {/* Active 13 Areas Overview Card */}
          <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-emerald-900 font-semibold text-sm">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>13 Active Retail Service Areas (Bangalore)</span>
              </div>
              <span className="text-xs text-emerald-700 font-medium">
                Admin can edit labels, toggle PIN codes, or add new areas below
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
              {DEFAULT_RETAIL_AREAS.map((item) => {
                const pinRow = pincodes.find((p) => p.pincode === item.pincode);
                const isActive = pinRow ? pinRow.enabled : item.enabled;
                return (
                  <div
                    key={item.id}
                    className={`px-3 py-2 rounded-lg border text-xs flex items-center justify-between gap-2 ${
                      isActive
                        ? 'bg-white border-emerald-200 text-brand-black'
                        : 'bg-brand-gray-100 border-brand-gray-200 text-brand-gray-400'
                    }`}
                  >
                    <span className="truncate font-medium">
                      {item.slNo}. {item.areaName}
                    </span>
                    <span className="font-mono text-[11px] font-bold text-emerald-700 shrink-0">
                      {item.displayPincode}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-brand-gray-400" />
              <input
                value={pincodeSearch}
                onChange={(e) => setPincodeSearch(e.target.value)}
                placeholder="Search PIN or locality (e.g. Kammanahalli, 560084)..."
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
            <button
              onClick={() => loadPincodes()}
              className="p-2 text-brand-gray-500 hover:bg-brand-gray-100 rounded-lg"
              title="Refresh"
            >
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
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 rounded-lg disabled:opacity-50"
            >
              <Download className="w-4 h-4" /> Sync / Restore 13 Default Areas
            </button>
          </div>

          {showBulkImport && (
            <div className="border border-brand-gray-200 rounded-lg p-4 bg-brand-gray-50 space-y-2">
              <p className="text-xs text-brand-gray-500">
                One PIN code per line (optionally &ldquo;PINCODE | Area Label&rdquo;). Imported as enabled so customers can order immediately.
              </p>
              <textarea
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
                rows={5}
                placeholder={'560084 | Kammanahalli, Lingarajapuram\n560043 | Banaswadi, HRBR Layout, HBR Layout, Hennur, Kalyan Nagar'}
                className="w-full px-3 py-2 border border-brand-gray-200 rounded-lg text-sm font-mono outline-none focus:border-emerald-600"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleBulkImport}
                  disabled={busy}
                  className="px-4 py-2 text-sm font-semibold bg-brand-black text-white rounded-lg disabled:opacity-50"
                >
                  Import &amp; Enable
                </button>
                <button
                  onClick={() => setShowBulkImport(false)}
                  className="px-4 py-2 text-sm font-semibold text-brand-gray-600 hover:bg-brand-gray-100 rounded-lg"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-end gap-3 border border-brand-gray-200 rounded-lg p-4 bg-white">
            <div>
              <label className="block text-xs font-medium text-brand-gray-600 mb-1">
                PIN Code
              </label>
              <input
                value={newPincode}
                onChange={(e) =>
                  setNewPincode(e.target.value.replace(/\D/g, '').slice(0, 6))
                }
                placeholder="560084"
                className="w-32 px-3 py-2 border border-brand-gray-200 rounded-lg text-sm font-mono outline-none focus:border-emerald-600"
              />
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="block text-xs font-medium text-brand-gray-600 mb-1">
                Area Name(s) / Label
              </label>
              <input
                value={newPincodeLabel}
                onChange={(e) => setNewPincodeLabel(e.target.value)}
                placeholder="e.g. Indiranagar, Cox Town"
                className="w-full px-3 py-2 border border-brand-gray-200 rounded-lg text-sm outline-none focus:border-emerald-600"
              />
            </div>
            <label className="flex items-center gap-2 text-xs font-semibold text-brand-gray-700 py-2.5 px-2 cursor-pointer">
              <input
                type="checkbox"
                checked={newPincodeEnabled}
                onChange={(e) => setNewPincodeEnabled(e.target.checked)}
                className="rounded border-brand-gray-300 text-emerald-600 focus:ring-emerald-500"
              />
              Enable Immediately
            </label>
            <button
              onClick={handleAddPincode}
              disabled={busy}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg disabled:opacity-50"
            >
              <Plus className="w-4 h-4" /> Add Retail Area PIN
            </button>
          </div>

          <div className="border border-brand-gray-200 rounded-lg overflow-hidden bg-white">
            <table className="w-full text-sm">
              <thead className="bg-brand-gray-50 text-left text-brand-gray-500">
                <tr>
                  <th className="px-4 py-3">PIN Code</th>
                  <th className="px-4 py-3">Active Localities / Areas</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loadingPincodes ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-brand-gray-500">
                      Loading...
                    </td>
                  </tr>
                ) : filteredPincodes.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-brand-gray-500">
                      No PIN codes found.
                    </td>
                  </tr>
                ) : (
                  filteredPincodes.map((p) => (
                    <tr key={p.pincode} className="border-t border-brand-gray-100">
                      <td className="px-4 py-3 font-mono font-bold text-brand-black">
                        {p.pincode}
                      </td>
                      <td className="px-4 py-3 text-brand-gray-700">
                        {editingPin === p.pincode ? (
                          <div className="flex items-center gap-2">
                            <input
                              value={editLabelDraft}
                              onChange={(e) => setEditLabelDraft(e.target.value)}
                              className="flex-1 px-2.5 py-1 border border-brand-gray-300 rounded-md text-xs outline-none focus:border-emerald-600"
                              placeholder="Area names..."
                            />
                            <button
                              onClick={() => handleSaveLabelEdit(p)}
                              disabled={busy}
                              className="p-1.5 bg-emerald-600 text-white rounded-md hover:bg-emerald-700"
                              title="Save"
                            >
                              <Save className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setEditingPin(null)}
                              className="p-1.5 bg-brand-gray-100 text-brand-gray-600 rounded-md"
                              title="Cancel"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span>{p.label || '—'}</span>
                            <button
                              onClick={() => {
                                setEditingPin(p.pincode);
                                setEditLabelDraft(p.label || '');
                              }}
                              className="p-1 text-brand-gray-400 hover:text-brand-black rounded"
                              title="Edit Area Names"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleToggleEnabled(p)}
                          className={`text-xs font-bold px-2.5 py-1 rounded-full border ${
                            p.enabled
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-brand-gray-100 text-brand-gray-500 border-brand-gray-200'
                          }`}
                        >
                          {p.enabled ? 'Enabled' : 'Disabled'}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => handleRemovePincode(p.pincode)}
                          className="text-red-500 hover:bg-red-50 p-2 rounded-lg"
                          title="Remove PIN code"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {section === 'wholesale' && (
        <div className="space-y-4">
          <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 text-emerald-900">
              <Truck className="w-5 h-5 text-emerald-600 shrink-0" />
              <div>
                <p className="text-sm font-semibold">
                  All Over India Wholesale Delivery Active
                </p>
                <p className="text-xs text-emerald-700">
                  Any valid 6-digit Indian PIN code is accepted for wholesale orders. Add custom zones below to set state-specific fees or minimum order values.
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                setZoneDraft({ pincodePrefixes: ['ALL'], enabled: true });
                setShowZoneForm(true);
              }}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold bg-brand-black text-white rounded-lg"
            >
              <Plus className="w-4 h-4" /> New Shipping Zone
            </button>
          </div>

          {showZoneForm && (
            <div className="border border-brand-gray-200 rounded-lg p-4 space-y-3 bg-brand-gray-50">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-brand-black">
                  {zoneDraft.id ? 'Edit Zone' : 'New Zone'}
                </h4>
                <button onClick={() => setShowZoneForm(false)}>
                  <X className="w-4 h-4 text-brand-gray-400" />
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-brand-gray-600 mb-1">
                    Zone Label
                  </label>
                  <input
                    value={zoneDraft.label || ''}
                    onChange={(e) =>
                      setZoneDraft((d) => ({ ...d, label: e.target.value }))
                    }
                    placeholder="All Over India (Pan-India)"
                    className="w-full px-3 py-2 border border-brand-gray-200 rounded-lg text-sm outline-none focus:border-emerald-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-brand-gray-600 mb-1">
                    ETA (optional)
                  </label>
                  <input
                    value={zoneDraft.etaDays || ''}
                    onChange={(e) =>
                      setZoneDraft((d) => ({ ...d, etaDays: e.target.value }))
                    }
                    placeholder="2-5 business days"
                    className="w-full px-3 py-2 border border-brand-gray-200 rounded-lg text-sm outline-none focus:border-emerald-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-brand-gray-600 mb-1">
                    Shipping Fee (₹)
                  </label>
                  <input
                    type="number"
                    value={zoneDraft.shippingFee ?? ''}
                    onChange={(e) =>
                      setZoneDraft((d) => ({
                        ...d,
                        shippingFee: Number(e.target.value),
                      }))
                    }
                    className="w-full px-3 py-2 border border-brand-gray-200 rounded-lg text-sm outline-none focus:border-emerald-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-brand-gray-600 mb-1">
                    Minimum Order Value (₹)
                  </label>
                  <input
                    type="number"
                    value={zoneDraft.minOrderValue ?? ''}
                    onChange={(e) =>
                      setZoneDraft((d) => ({
                        ...d,
                        minOrderValue: Number(e.target.value),
                      }))
                    }
                    className="w-full px-3 py-2 border border-brand-gray-200 rounded-lg text-sm outline-none focus:border-emerald-600"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-brand-gray-600 mb-1">
                    PIN Code Prefixes (Enter &ldquo;ALL&rdquo; for All Over India, or 3-digit prefixes comma-separated)
                  </label>
                  <input
                    value={(zoneDraft.pincodePrefixes || []).join(', ')}
                    onChange={(e) =>
                      setZoneDraft((d) => ({
                        ...d,
                        pincodePrefixes: e.target.value
                          .split(',')
                          .map((s) => s.trim().toUpperCase())
                          .filter(Boolean),
                      }))
                    }
                    placeholder="ALL (or 560, 561, 400, 110)"
                    className="w-full px-3 py-2 border border-brand-gray-200 rounded-lg text-sm font-mono outline-none focus:border-emerald-600"
                  />
                  <p className="text-[11px] text-brand-gray-500 mt-1">
                    Use <code className="font-mono font-bold">ALL</code> to cover all Indian PIN codes nationwide, or 3-digit prefixes for specific regions.
                  </p>
                </div>
              </div>
              <button
                onClick={handleSaveZone}
                disabled={busy}
                className="px-4 py-2 text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg disabled:opacity-50"
              >
                Save Zone
              </button>
            </div>
          )}

          <div className="border border-brand-gray-200 rounded-lg overflow-hidden bg-white">
            <table className="w-full text-sm">
              <thead className="bg-brand-gray-50 text-left text-brand-gray-500">
                <tr>
                  <th className="px-4 py-3">Zone</th>
                  <th className="px-4 py-3">Coverage</th>
                  <th className="px-4 py-3">Fee / Min Order</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loadingZones ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-brand-gray-500">
                      Loading...
                    </td>
                  </tr>
                ) : zones.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-brand-gray-500">
                      No wholesale zones configured yet.
                    </td>
                  </tr>
                ) : (
                  zones.map((z) => (
                    <tr key={z.id} className="border-t border-brand-gray-100">
                      <td className="px-4 py-3 font-medium">
                        {z.label}
                        {z.etaDays ? (
                          <span className="block text-xs text-brand-gray-400">
                            {z.etaDays}
                          </span>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 text-brand-gray-600 font-mono text-xs">
                        {z.pincodePrefixes.includes('ALL')
                          ? 'ALL INDIA (Every 6-digit Indian PIN)'
                          : z.pincodePrefixes.join(', ')}
                      </td>
                      <td className="px-4 py-3 text-brand-gray-600">
                        ₹{z.shippingFee} / ₹{z.minOrderValue}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleToggleZone(z)}
                          className={`text-xs font-bold px-2.5 py-1 rounded-full border ${
                            z.enabled
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-brand-gray-100 text-brand-gray-500 border-brand-gray-200'
                          }`}
                        >
                          {z.enabled ? 'Enabled' : 'Disabled'}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-right flex items-center justify-end gap-1">
                        <button
                          onClick={() => {
                            setZoneDraft(z);
                            setShowZoneForm(true);
                          }}
                          className="text-blue-600 hover:bg-blue-50 p-2 rounded-lg text-xs font-semibold"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteZone(z.id)}
                          className="text-red-500 hover:bg-red-50 p-2 rounded-lg"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
