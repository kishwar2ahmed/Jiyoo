import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, MapPin, Navigation, Search, Check, Loader2, Bookmark, Compass, Shield } from 'lucide-react';
import { useModalBackButton } from '../hooks/useModalBackButton';
import { hasMapsAndLocationConsent, savePrivacyConsentPreferences, getPrivacyConsentPreferences } from './CookieConsentBanner';
import { DEFAULT_RETAIL_AREAS, RetailAreaItem, normalizeIndianPincode } from '../../../constants/deliveryAreas';
import { fetchJsonWithProxyRetry } from '../../../utils/apiFetch';

interface LocationPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectLocation: (data: { address: string; pincode: string }) => void;
  savedAddresses?: Array<{ id?: string; name: string; address: string; pincode: string }>;
  initialTab?: 'map' | 'saved';
}

export function LocationPickerModal({
  isOpen,
  onClose,
  onSelectLocation,
  savedAddresses = [],
  initialTab = 'map'
}: LocationPickerModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isGpsLoading, setIsGpsLoading] = useState(false);
  const [selectedCoords, setSelectedCoords] = useState<{ lat: number; lng: number }>({
    lat: 12.9716, // Default Bangalore center
    lng: 77.5946
  });
  const [formattedAddress, setFormattedAddress] = useState('');
  const [pincode, setPincode] = useState('');
  const [activeTab, setActiveTab] = useState<'map' | 'saved'>(initialTab);
  const [mapEmbedAllowed, setMapEmbedAllowed] = useState<boolean>(() => hasMapsAndLocationConsent());
  const [retailAreas, setRetailAreas] = useState<RetailAreaItem[]>(DEFAULT_RETAIL_AREAS);
  const [pinStatus, setPinStatus] = useState<{ serviceable: boolean | null; message: string | null }>({
    serviceable: null,
    message: null,
  });

  useModalBackButton(isOpen, onClose);

  // Sync activeTab and consent state when modal opens
  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      setMapEmbedAllowed(hasMapsAndLocationConsent());
      fetchJsonWithProxyRetry<{ success?: boolean; retailAreas?: RetailAreaItem[] }>('/api/delivery/active-areas')
        .then(({ res, data }) => {
          if (res.ok && data?.success && Array.isArray(data.retailAreas) && data.retailAreas.length > 0) {
            setRetailAreas(data.retailAreas.filter((a: RetailAreaItem) => a && a.enabled !== false));
          }
        })
        .catch(() => {});
    }
  }, [isOpen, initialTab]);

  useEffect(() => {
    if (!isOpen) return;
    const cleanPin = normalizeIndianPincode(pincode);
    if (!/^\d{6}$/.test(cleanPin)) {
      setPinStatus({ serviceable: null, message: null });
      return;
    }
    let cancelled = false;
    fetchJsonWithProxyRetry<{ serviceable?: boolean; message?: string; label?: string }>(
      `/api/delivery/check-pincode?pincode=${encodeURIComponent(cleanPin)}&mode=retail`
    )
      .then(({ res, data }) => {
        if (cancelled || !res.ok || !data) return;
        setPinStatus({
          serviceable: Boolean(data?.serviceable),
          message:
            data?.message ||
            (data?.serviceable ? `Retail delivery active (${data?.label || cleanPin})` : 'Outside retail delivery zone'),
        });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [isOpen, pincode]);

  useEffect(() => {
    const syncConsent = () => setMapEmbedAllowed(hasMapsAndLocationConsent());
    window.addEventListener('jiyoo-privacy-consent-updated', syncConsent);
    return () => window.removeEventListener('jiyoo-privacy-consent-updated', syncConsent);
  }, []);

  const allSaved = savedAddresses;

  const reverseGeocode = async (lat: number, lng: number) => {
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
      const data = await res.json();
      if (data && data.address) {
        const parts = [];
        if (data.address.building || data.address.amenity) parts.push(data.address.building || data.address.amenity);
        if (data.address.road) parts.push(data.address.road);
        if (data.address.suburb || data.address.neighbourhood) parts.push(data.address.suburb || data.address.neighbourhood);
        if (data.address.city || data.address.town || data.address.village) parts.push(data.address.city || data.address.town || data.address.village);
        if (data.address.state) parts.push(data.address.state);

        const fullAddr = parts.join(', ');
        setFormattedAddress(fullAddr || data.display_name || `Lat ${lat.toFixed(5)}, Lng ${lng.toFixed(5)}`);
        if (data.address.postcode) {
          setPincode(data.address.postcode);
        }
      } else {
        setFormattedAddress(`Lat ${lat.toFixed(5)}, Lng ${lng.toFixed(5)}`);
      }
    } catch (e) {
      console.warn('Reverse geocode failed:', e);
      setFormattedAddress((prev) => prev || `Lat ${lat.toFixed(5)}, Lng ${lng.toFixed(5)}`);
    }
  };

  const [groundingData, setGroundingData] = useState<{
    text?: string;
    mapsLinks?: Array<{ uri: string; title: string }>;
    reviewSnippets?: string[];
  } | null>(null);
  const [isGroundingLoading, setIsGroundingLoading] = useState(false);

  const fetchMapsGrounding = async (queryText?: string) => {
    const q = (queryText || formattedAddress || searchQuery).trim();
    if (!q) return;
    setIsGroundingLoading(true);
    try {
      const { res, data } = await fetchJsonWithProxyRetry('/api/maps/grounding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: q,
          lat: selectedCoords.lat,
          lng: selectedCoords.lng,
        }),
      });
      if (res.ok && data?.success) {
        setGroundingData({
          text: data.text,
          mapsLinks: data.mapsLinks,
          reviewSnippets: data.reviewSnippets,
        });
      }
    } catch (err) {
      console.warn('Maps grounding lookup failed:', err);
    } finally {
      setIsGroundingLoading(false);
    }
  };

  const handleDetectGps = () => {
    if (!navigator.geolocation) return;
    setIsGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setSelectedCoords({ lat, lng });
        await reverseGeocode(lat, lng);
        setIsGpsLoading(false);
      },
      (err) => {
        console.warn('GPS error:', err);
        setIsGpsLoading(false);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const handleEnableMapEmbed = () => {
    const current = getPrivacyConsentPreferences();
    savePrivacyConsentPreferences({
      mapsAndLocation: true,
      analytics: current.analytics,
      marketing: current.marketing,
      doNotSellOrShare: current.doNotSellOrShare,
    });
    setMapEmbedAllowed(true);
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery + ', India')}&limit=5`);
      const data = await res.json();
      setSearchResults(data || []);
    } catch (err) {
      console.warn('Search error:', err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectSearchResult = (result: any) => {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
    setSelectedCoords({ lat, lng });
    setFormattedAddress(result.display_name);
    if (result.address && result.address.postcode) {
      setPincode(result.address.postcode);
    } else {
      // attempt extract pincode regex
      const match = result.display_name.match(/\b\d{6}\b/);
      if (match) setPincode(match[0]);
    }
    setSearchResults([]);
    setSearchQuery('');
  };

  const handleConfirm = () => {
    if (!formattedAddress) return;
    onSelectLocation({ address: formattedAddress, pincode });
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
      <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/80">
            <div className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-emerald-600" />
              <h3 className="font-serif text-lg font-semibold text-gray-900">Select Delivery Location</h3>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-200 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Tabs */}
          <div className="flex border-b border-gray-100 text-xs font-medium">
            <button
              type="button"
              onClick={() => setActiveTab('map')}
              className={`flex-1 py-3 text-center transition-all flex items-center justify-center gap-2 ${
                activeTab === 'map'
                  ? 'border-b-2 border-emerald-600 text-emerald-700 font-semibold bg-emerald-50/40'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              <Compass className="w-4 h-4" />
              Google Map & Search
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('saved')}
              className={`flex-1 py-3 text-center transition-all flex items-center justify-center gap-2 ${
                activeTab === 'saved'
                  ? 'border-b-2 border-emerald-600 text-emerald-700 font-semibold bg-emerald-50/40'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              <Bookmark className="w-4 h-4" />
              Saved Addresses ({allSaved.length})
            </button>
          </div>

          <div className="p-4 overflow-y-auto space-y-4 flex-1">
            {activeTab === 'map' ? (
              <>
                {/* Search Box */}
                <form onSubmit={handleSearch} className="relative">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search area, landmark, locality..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-20 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:bg-white transition-all"
                    />
                    <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5" />
                    <button
                      type="submit"
                      disabled={isSearching}
                      className="absolute right-1.5 top-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1"
                    >
                      {isSearching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Search'}
                    </button>
                  </div>
                  <p className="text-[10px] text-gray-500 mt-1 px-1">
                    Address search queries OpenStreetMap (Nominatim) only when you click Search or Use Current GPS Location.
                  </p>

                  {/* Search Dropdown */}
                  {searchResults.length > 0 && (
                    <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl z-20 max-h-48 overflow-y-auto divide-y divide-gray-100">
                      {searchResults.map((item, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleSelectSearchResult(item)}
                          className="w-full text-left p-3 hover:bg-emerald-50/60 transition-colors text-xs text-gray-700 flex items-start gap-2"
                        >
                          <MapPin className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                          <span className="line-clamp-2">{item.display_name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </form>

                {/* GPS Detect Button */}
                <button
                  type="button"
                  onClick={handleDetectGps}
                  disabled={isGpsLoading}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-semibold rounded-xl border border-emerald-200 transition-all shadow-xs"
                >
                  {isGpsLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                      Acquiring GPS Pinpoint...
                    </>
                  ) : (
                    <>
                      <Navigation className="w-4 h-4 text-emerald-600" />
                      Use Current GPS Location
                    </>
                  )}
                </button>

                {/* Google Maps Visual Embed — Consent-Gated (Loads only after click or consent) */}
                <div className="relative w-full h-48 rounded-2xl overflow-hidden border border-gray-200 shadow-inner bg-gray-100">
                  {mapEmbedAllowed ? (
                    <>
                      <iframe
                        title="Location Preview Map"
                        src={`https://maps.google.com/maps?q=${selectedCoords.lat},${selectedCoords.lng}&z=16&output=embed`}
                        className="w-full h-full border-0"
                        loading="lazy"
                      />
                      <div className="absolute bottom-2 right-2 bg-white/90 backdrop-blur-xs px-2.5 py-1 rounded-md text-[10px] font-mono text-gray-600 border border-gray-200 shadow-2xs">
                        {selectedCoords.lat.toFixed(4)}, {selectedCoords.lng.toFixed(4)}
                      </div>
                    </>
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center bg-stone-50 space-y-2.5">
                      <div className="w-9 h-9 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center">
                        <Shield className="w-4 h-4 text-emerald-700" />
                      </div>
                      <div className="space-y-1 max-w-xs">
                        <p className="text-xs font-bold text-stone-900">
                          Interactive Google Map Blocked by Default
                        </p>
                        <p className="text-[11px] text-stone-500 leading-snug">
                          Loading the map connects to <code className="font-mono text-[10px]">maps.google.com</code>. Click below to load the map or enter your address directly below.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handleEnableMapEmbed}
                        className="px-3.5 py-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 text-white text-[11px] font-semibold transition-colors cursor-pointer"
                      >
                        Load Interactive Google Map
                      </button>
                    </div>
                  )}
                </div>

                {/* Address Input & Pincode confirmation */}
                <div className="space-y-3 pt-1">
                  <div>
                    <label className="block text-[11px] uppercase tracking-wider text-gray-500 font-semibold mb-1">
                      Detected / Selected Address
                    </label>
                    <textarea
                      rows={2}
                      value={formattedAddress}
                      onChange={(e) => setFormattedAddress(e.target.value)}
                      placeholder="Street, House No., Building Name, Locality..."
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:bg-white transition-all resize-none font-medium"
                    />
                  </div>

                  {/* Active Retail Areas & PIN Quick-Select */}
                  <div className="p-3 bg-emerald-50/50 border border-emerald-200/70 rounded-xl space-y-2">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-900">
                      Quick Select: Active Bengaluru Areas &amp; PIN Codes
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {retailAreas.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => {
                            setFormattedAddress(`${item.areaName}, Bengaluru`);
                            setPincode(item.pincode);
                          }}
                          className={`px-2 py-1 rounded-lg text-[11px] font-medium border transition-colors cursor-pointer ${
                            normalizeIndianPincode(pincode) === item.pincode &&
                            formattedAddress.toLowerCase().includes(item.areaName.toLowerCase())
                              ? 'bg-emerald-700 text-white border-emerald-700'
                              : 'bg-white hover:bg-emerald-50 text-stone-800 border-emerald-200'
                          }`}
                        >
                          {item.areaName} · <span className="font-mono">{item.displayPincode}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] uppercase tracking-wider text-gray-500 font-semibold mb-1">
                      Pincode / Postal Code
                    </label>
                    <input
                      type="text"
                      maxLength={12}
                      value={pincode}
                      onChange={(e) => setPincode(e.target.value)}
                      placeholder="e.g. 560084"
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:bg-white transition-all font-mono"
                    />
                    {pinStatus.serviceable !== null && pinStatus.message && (
                      <p
                        className={`mt-1.5 text-[11px] font-medium ${
                          pinStatus.serviceable ? 'text-emerald-700' : 'text-amber-700'
                        }`}
                      >
                        {pinStatus.serviceable ? '✓' : '!'} {pinStatus.message}
                      </p>
                    )}
                  </div>

                  {/* Google Maps Grounding Intelligence (Explicit AI Disclosure) */}
                  <div className="pt-2 space-y-1">
                    <button
                      type="button"
                      onClick={() => fetchMapsGrounding()}
                      disabled={isGroundingLoading || (!formattedAddress.trim() && !searchQuery.trim())}
                      className="w-full py-2 px-3 bg-stone-100 hover:bg-stone-200 text-stone-800 text-[11px] font-semibold rounded-xl border border-stone-200 transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
                    >
                      {isGroundingLoading ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                          Consulting Google Maps &amp; Gemini AI...
                        </>
                      ) : (
                        <>
                          <Compass className="w-3.5 h-3.5 text-emerald-600" />
                          Verify Locality with Google Maps (AI Summary)
                        </>
                      )}
                    </button>
                    <p className="text-[10px] text-stone-500 text-center">
                      Optional: Sends the searched locality &amp; coordinates to Google Gemini + Google Maps Grounding to generate an AI-assisted landmark summary.
                    </p>

                    {groundingData && (
                      <div className="mt-2.5 p-3 bg-emerald-50/70 border border-emerald-200/80 rounded-xl space-y-2 text-xs">
                        <div className="flex items-center justify-between gap-2 pb-1 border-b border-emerald-200/60">
                          <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-emerald-900">
                            AI-Generated Locality Summary (Google Gemini + Maps)
                          </span>
                        </div>
                        {groundingData.text && (
                          <p className="text-stone-700 text-[11px] leading-relaxed">
                            {groundingData.text}
                          </p>
                        )}
                        {groundingData.mapsLinks && groundingData.mapsLinks.length > 0 && (
                          <div className="pt-1 flex flex-wrap gap-2">
                            {groundingData.mapsLinks.map((link, idx) => (
                              <a
                                key={idx}
                                href={link.uri}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 px-2.5 py-1 bg-white text-emerald-700 hover:text-emerald-800 border border-emerald-300 rounded-lg text-[10px] font-semibold transition-colors shadow-2xs"
                              >
                                <MapPin className="w-3 h-3 text-emerald-600" />
                                {link.title || 'Open in Google Maps'}
                              </a>
                            ))}
                          </div>
                        )}
                        {groundingData.reviewSnippets && groundingData.reviewSnippets.length > 0 && (
                          <div className="pt-1 border-t border-emerald-200/50">
                            <p className="text-[10px] font-bold uppercase text-emerald-900 tracking-wider">Locality Highlights:</p>
                            <ul className="list-disc pl-4 text-[10px] text-stone-600 space-y-0.5 mt-0.5">
                              {groundingData.reviewSnippets.slice(0, 2).map((snip, idx) => (
                                <li key={idx}>{snip}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </>
            ) : (
              /* Saved Addresses Tab */
              <div className="space-y-3">
                {allSaved.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 space-y-2">
                    <Bookmark className="w-8 h-8 text-gray-300 mx-auto" />
                    <p className="text-xs">No saved addresses found in your profile.</p>
                    <p className="text-[11px] text-gray-400">Addresses used during checkout will be saved automatically for future orders.</p>
                  </div>
                ) : (
                  allSaved.map((item, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => {
                        setFormattedAddress(item.address);
                        if (item.pincode) setPincode(item.pincode);
                        onSelectLocation({ address: item.address, pincode: item.pincode || '' });
                        onClose();
                      }}
                      className="w-full text-left p-3.5 bg-gray-50 hover:bg-emerald-50/70 border border-gray-200 hover:border-emerald-300 rounded-2xl transition-all flex items-start justify-between group"
                    >
                      <div className="space-y-1">
                        <span className="font-semibold text-xs text-gray-900 group-hover:text-emerald-800 block">
                          {item.name || `Address #${i + 1}`}
                        </span>
                        <p className="text-xs text-gray-600 line-clamp-2">{item.address}</p>
                        {item.pincode && <span className="text-[10px] font-mono text-gray-500 block">Pincode: {item.pincode}</span>}
                      </div>
                      <span className="px-2.5 py-1 bg-emerald-600 text-white rounded-lg text-[10px] font-bold uppercase opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-1">
                        Select
                      </span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Footer Action */}
          {activeTab === 'map' && (
            <div className="p-4 border-t border-gray-100 bg-gray-50/80">
              <button
                type="button"
                onClick={handleConfirm}
                disabled={!formattedAddress.trim()}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold uppercase tracking-wider rounded-xl transition-all shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Check className="w-4 h-4" />
                Confirm Location & Apply
              </button>
            </div>
          )}
        </motion.div>
      </div>
      )}
    </AnimatePresence>
  );
}
