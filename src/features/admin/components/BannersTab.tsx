import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Plus,
  ArrowUp,
  ArrowDown,
  Edit2,
  Trash2,
  Eye,
  EyeOff,
  RotateCcw,
  Sparkles,
  Search,
  CheckCircle2,
  Image as ImageIcon,
  Layers,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  X,
  UploadCloud,
  Check,
} from 'lucide-react';
import { useSettings } from '../../../contexts/SettingsContext';
import { BannerSlide } from '../../../types';
import { DEFAULT_HERO_BANNERS, PRESET_BANNER_IMAGES, PresetBannerOption } from '../../../constants/banners';
import { useConfirm } from '../../core/contexts/ConfirmContext';
import { uploadImageFile, describeUploadError } from '../hooks/useImageUploader';

interface BannerFormData {
  id?: string;
  image: string;
  alt: string;
  badge: string;
  title: string;
  subtitle: string;
  isActive: boolean;
  order?: number;
  isFeatured?: boolean;
  highlightTone?: 'amber' | 'emerald' | 'none';
}

const BADGE_SUGGESTIONS = [
  'Festive Special',
  'Diwali Special',
  'Farm Fresh',
  'Global Fresh',
  'Daily Harvest',
  'Artisanal Cuts',
  'Fresh Catch',
  'Pure Wellness',
  'Ready to Cook',
  'Pantry Picks',
  'Clean Energy',
  'Vitality Bowls',
  'Special Offer',
];

export function BannersTab() {
  const { settings, updateBanners, resetBannersToDefault } = useSettings();
  const confirm = useConfirm();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'active' | 'hidden'>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState<BannerFormData | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showLivePreview, setShowLivePreview] = useState(false);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modal Image selection mode
  const [imageSourceTab, setImageSourceTab] = useState<'presets' | 'upload' | 'url'>('presets');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const banners = useMemo<BannerSlide[]>(() => {
    const raw = settings.heroBanners && settings.heroBanners.length > 0 
      ? settings.heroBanners 
      : DEFAULT_HERO_BANNERS;
    return [...raw].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }, [settings.heroBanners]);

  const hasDiwaliBanner = useMemo(() => {
    return banners.some((b) => 
      b.id?.includes('diwali') || 
      b.image?.includes('diwali') || 
      b.image?.includes('file_000000002410821198a81a83a16d503f')
    );
  }, [banners]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3200);
  };

  const filteredBanners = useMemo(() => {
    return banners.filter((b) => {
      const matchesSearch =
        b.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.badge.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.subtitle.toLowerCase().includes(searchQuery.toLowerCase());
      
      if (!matchesSearch) return false;
      if (filterMode === 'active') return b.isActive !== false;
      if (filterMode === 'hidden') return b.isActive === false;
      return true;
    });
  }, [banners, searchQuery, filterMode]);

  const activeCount = banners.filter((b) => b.isActive !== false).length;
  const hiddenCount = banners.length - activeCount;

  // Toggle active status
  const handleToggleActive = async (bannerId: string) => {
    const updated = banners.map((b) =>
      b.id === bannerId ? { ...b, isActive: !b.isActive } : b
    );
    try {
      await updateBanners(updated);
      showToast('Banner visibility updated');
    } catch (err) {
      console.error(err);
      showToast('Failed to update banner visibility');
    }
  };

  // Move banner up
  const handleMoveUp = async (index: number) => {
    if (index <= 0) return;
    const reordered = [...banners];
    const temp = reordered[index - 1];
    reordered[index - 1] = reordered[index];
    reordered[index] = temp;
    try {
      await updateBanners(reordered);
      showToast('Banner moved up');
    } catch (err) {
      console.error(err);
      showToast('Failed to reorder banner');
    }
  };

  // Move banner down
  const handleMoveDown = async (index: number) => {
    if (index >= banners.length - 1) return;
    const reordered = [...banners];
    const temp = reordered[index + 1];
    reordered[index + 1] = reordered[index];
    reordered[index] = temp;
    try {
      await updateBanners(reordered);
      showToast('Banner moved down');
    } catch (err) {
      console.error(err);
      showToast('Failed to reorder banner');
    }
  };

  // Delete banner
  const handleDelete = async (banner: BannerSlide) => {
    const confirmed = await confirm({
      title: 'Delete Hero Banner?',
      message: `Are you sure you want to delete "${banner.title}"? You can always restore the default presets later.`,
      confirmLabel: 'Delete Banner',
      danger: true,
    });
    if (!confirmed) return;

    const updated = banners.filter((b) => b.id !== banner.id);
    try {
      await updateBanners(updated);
      showToast('Banner removed from showcase');
    } catch (err) {
      console.error(err);
      showToast('Failed to delete banner');
    }
  };

  // Reset to default banners
  const handleResetDefaults = async () => {
    const confirmed = await confirm({
      title: 'Reset to Default Banners?',
      message: 'This will replace current banners with the 10 curated original JIYOO hero banners. Any custom edits will be reset.',
      confirmLabel: 'Reset to Defaults',
      danger: false,
    });
    if (!confirmed) return;

    try {
      await resetBannersToDefault();
      showToast('Hero banners reset to original curated presets');
    } catch (err) {
      console.error(err);
      showToast('Failed to reset banners');
    }
  };

  // Quick Add Diwali Special Sale Banner
  const handleAddDiwaliBanner = async () => {
    const diwaliSlide: BannerSlide = {
      id: `diwali-special-${Date.now()}`,
      image: '/banners/diwali_special_sale.png',
      alt: 'Special Diwali Sale - Exclusive Festive Offers',
      badge: 'Festive Special',
      title: 'Special Diwali Sale',
      subtitle: 'Exclusive Festive Offer & Fresh Gourmet Selection',
      isActive: true,
      isFeatured: true,
      highlightTone: 'amber',
      order: 0,
    };
    const updated = [diwaliSlide, ...banners.map((b, idx) => ({ ...b, order: idx + 1 }))];
    try {
      await updateBanners(updated);
      showToast('✨ Special Diwali Sale banner added with luminous amber spotlight');
    } catch (err) {
      console.error(err);
      showToast('Failed to add banner');
    }
  };

  // Open Add Modal
  const handleOpenAddModal = () => {
    setEditingBanner({
      image: '/banners/02_Indian_Fruits_Original.png',
      alt: 'Fresh harvest banner',
      badge: 'Seasonal Harvest',
      title: 'New Featured Showcase',
      subtitle: 'Premium hand-selected produce delivered straight to your door',
      isActive: true,
    });
    setImageSourceTab('presets');
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (banner: BannerSlide) => {
    setEditingBanner({ ...banner });
    setImageSourceTab(banner.image.startsWith('/banners/') ? 'presets' : 'url');
    setIsModalOpen(true);
  };

  // Save Modal Form
  const handleSaveModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBanner || !editingBanner.title.trim() || !editingBanner.image.trim()) {
      return;
    }

    setIsSaving(true);
    try {
      let updated: BannerSlide[];
      if (editingBanner.id) {
        // Edit existing
        updated = banners.map((b) =>
          b.id === editingBanner.id
            ? {
                ...b,
                image: editingBanner.image,
                alt: editingBanner.alt || editingBanner.title,
                badge: editingBanner.badge || 'Featured',
                title: editingBanner.title,
                subtitle: editingBanner.subtitle,
                isActive: editingBanner.isActive,
                isFeatured: Boolean(editingBanner.isFeatured),
                highlightTone: editingBanner.highlightTone || (editingBanner.isFeatured ? 'amber' : 'none'),
              }
            : b
        );
      } else {
        // Add new
        const newSlide: BannerSlide = {
          id: `banner-${Date.now()}`,
          image: editingBanner.image,
          alt: editingBanner.alt || editingBanner.title,
          badge: editingBanner.badge || 'Featured',
          title: editingBanner.title,
          subtitle: editingBanner.subtitle,
          isActive: editingBanner.isActive,
          isFeatured: Boolean(editingBanner.isFeatured),
          highlightTone: editingBanner.highlightTone || (editingBanner.isFeatured ? 'amber' : 'none'),
          order: banners.length,
        };
        updated = [...banners, newSlide];
      }

      await updateBanners(updated);
      setIsModalOpen(false);
      setEditingBanner(null);
      showToast(editingBanner.id ? 'Banner updated successfully' : 'New banner added to showcase');
    } catch (err) {
      console.error(err);
      showToast('Failed to save banner');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle Preset Select
  const handleSelectPreset = (preset: PresetBannerOption) => {
    if (!editingBanner) return;
    const isDiwaliPreset = preset.id.includes('diwali') || preset.url.includes('diwali');
    setEditingBanner({
      ...editingBanner,
      image: preset.url,
      badge: editingBanner.badge || preset.defaultBadge,
      title: editingBanner.title === 'New Featured Showcase' ? preset.defaultTitle : editingBanner.title,
      subtitle: editingBanner.subtitle === 'Premium hand-selected produce delivered straight to your door' ? preset.defaultSubtitle : editingBanner.subtitle,
      alt: preset.defaultTitle,
      isFeatured: isDiwaliPreset ? true : editingBanner.isFeatured,
      highlightTone: isDiwaliPreset ? 'amber' : editingBanner.highlightTone,
    });
  };

  // Handle File Upload
  const handleFileUpload = async (file: File) => {
    setUploadError(null);
    setIsUploading(true);
    setUploadProgress(15);
    try {
      const url = await uploadImageFile(file, 'banners', false, setUploadProgress);
      if (editingBanner) {
        setEditingBanner({ ...editingBanner, image: url });
      }
      setUploadProgress(100);
      showToast('Image uploaded successfully');
    } catch (err: any) {
      console.error(err);
      setUploadError(describeUploadError(err));
    } finally {
      setTimeout(() => {
        setIsUploading(false);
        setUploadProgress(0);
      }, 350);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-6 right-6 z-[120] bg-brand-black text-brand-white px-4 py-3 rounded-xl shadow-xl border border-brand-gold/30 flex items-center gap-3 text-sm font-medium"
          >
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-brand-gray-200">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-serif font-bold text-brand-black">Hero Banners Control</h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-brand-gold/15 text-brand-black border border-brand-gold/30">
              {activeCount} Active / {banners.length} Total
            </span>
          </div>
          <p className="text-sm text-brand-gray-500 mt-1">
            Manage the hero slideshow slides, titles, badges, and ordering on the customer storefront.
          </p>
        </div>

        <div className="flex items-center flex-wrap gap-2.5">
          {!hasDiwaliBanner && (
            <button
              type="button"
              onClick={handleAddDiwaliBanner}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-amber-400 hover:bg-amber-500 text-stone-950 transition-colors shadow-sm cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-stone-950" />
              <span>+ Add Diwali Special</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setShowLivePreview(!showLivePreview)}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium border transition-colors cursor-pointer ${
              showLivePreview
                ? 'bg-brand-gray-900 text-brand-white border-brand-gray-900'
                : 'bg-brand-white text-brand-gray-700 border-brand-gray-300 hover:bg-brand-gray-50'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>{showLivePreview ? 'Hide Preview' : 'Live Storefront Preview'}</span>
          </button>

          <button
            type="button"
            onClick={handleResetDefaults}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium bg-brand-white text-brand-gray-700 border border-brand-gray-300 hover:bg-brand-gray-50 transition-colors cursor-pointer"
            title="Reset to 10 original curated JIYOO banners"
          >
            <RotateCcw className="w-4 h-4 text-brand-gray-500" />
            <span>Reset Defaults</span>
          </button>

          <button
            type="button"
            onClick={handleOpenAddModal}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-brand-gold hover:bg-brand-gold-dark text-brand-black transition-colors shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Banner</span>
          </button>
        </div>
      </div>

      {/* Live Preview Simulator (Collapsible) */}
      <AnimatePresence>
        {showLivePreview && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-gradient-to-br from-stone-900 to-stone-950 p-5 rounded-2xl border border-stone-800 text-white shadow-lg space-y-3">
              <div className="flex items-center justify-between text-xs text-stone-400">
                <span className="flex items-center gap-2 font-medium">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  Live Storefront Banner Simulation ({activeCount} active slides)
                </span>
                <span className="font-mono">
                  Slide {previewIndex + 1} of {banners.filter((b) => b.isActive !== false).length || 1}
                </span>
              </div>

              {banners.filter((b) => b.isActive !== false).length > 0 ? (
                (() => {
                  const activeBanners = banners.filter((b) => b.isActive !== false);
                  const currentSim = activeBanners[previewIndex % activeBanners.length];
                  const isSimDiwali = Boolean(
                    currentSim.id?.includes('diwali') || 
                    currentSim.image?.includes('diwali') ||
                    currentSim.image?.includes('file_000000002410821198a81a83a16d503f')
                  );
                  const isSimWhatsApp = Boolean(
                    currentSim.id?.includes('whatsapp') ||
                    currentSim.image?.includes('whatsapp') ||
                    currentSim.image?.includes('file_00000000e7e48211898141e9b8e21f64')
                  );
                  return (
                    <div
                      className={`relative aspect-[2048/768] max-h-[260px] rounded-xl overflow-hidden transition-all duration-500 ${
                        isSimDiwali
                          ? 'border-2 border-amber-400 ring-2 ring-amber-400/80 shadow-[0_0_30px_rgba(245,158,11,0.5)] bg-black'
                          : isSimWhatsApp
                          ? 'border-2 border-emerald-700/60 ring-1.5 ring-emerald-600/40 shadow-[0_0_30px_rgba(16,185,129,0.3)] bg-[#F6EFE6]'
                          : 'border border-white/10 bg-black'
                      }`}
                    >
                      <img
                        src={currentSim.image}
                        alt={currentSim.alt}
                        className={`w-full h-full ${
                          isSimWhatsApp ? 'object-contain object-center' : 'object-cover object-center'
                        }`}
                      />
                      {/* Subtle Edge Ring for Refined Luxury Finish */}
                      <div
                        aria-hidden="true"
                        className={`pointer-events-none absolute inset-0 transition-all duration-500 z-10 ${
                          isSimDiwali ? 'ring-1 ring-inset ring-amber-400/40' : isSimWhatsApp ? 'ring-1 ring-inset ring-emerald-400/35' : 'ring-1 ring-inset ring-white/10'
                        }`}
                      />

                      {/* Classy & Premium Editorial Bottom Caption */}
                      {currentSim.title && !currentSim.hideCaption && (
                        <div className="absolute inset-x-0 bottom-0 pt-8 pb-2.5 px-3 bg-gradient-to-t from-black/85 via-black/40 to-transparent pointer-events-none z-20">
                          <h4
                            className={`font-serif text-xs sm:text-sm font-medium tracking-wide drop-shadow-[0_2px_8px_rgba(0,0,0,0.85)] ${
                              isSimDiwali ? 'text-amber-200' : isSimWhatsApp ? 'text-emerald-200' : 'text-white'
                            }`}
                          >
                            {currentSim.title}
                          </h4>
                          {currentSim.subtitle && (
                            <p className="mt-0.5 text-[10px] sm:text-xs text-stone-300 font-sans tracking-normal line-clamp-1 drop-shadow-[0_1px_4px_rgba(0,0,0,0.8)]">
                              {currentSim.subtitle}
                            </p>
                          )}
                        </div>
                      )}
                      <div className="absolute inset-y-0 left-2 right-2 flex items-center justify-between pointer-events-none">
                        <button
                          type="button"
                          onClick={() =>
                            setPreviewIndex(
                              (prev) => (prev - 1 + activeBanners.length) % activeBanners.length
                            )
                          }
                          className="pointer-events-auto p-1.5 rounded-full bg-black/60 hover:bg-black/90 text-white border border-white/20 cursor-pointer"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setPreviewIndex((prev) => (prev + 1) % activeBanners.length)
                          }
                          className="pointer-events-auto p-1.5 rounded-full bg-black/60 hover:bg-black/90 text-white border border-white/20 cursor-pointer"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })()
              ) : (
                <div className="p-8 text-center text-stone-400 text-sm">
                  No active banners configured. The storefront will fall back to default presets.
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-gray-400" />
          <input
            type="text"
            placeholder="Search banners by title or badge..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-brand-white border border-brand-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-gold/50 transition-all placeholder:text-brand-gray-400"
          />
        </div>

        <div className="flex items-center gap-1 bg-brand-gray-100 p-1 rounded-xl self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setFilterMode('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
              filterMode === 'all'
                ? 'bg-brand-white text-brand-black shadow-xs'
                : 'text-brand-gray-600 hover:text-brand-black'
            }`}
          >
            All ({banners.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterMode('active')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
              filterMode === 'active'
                ? 'bg-brand-white text-brand-black shadow-xs'
                : 'text-brand-gray-600 hover:text-brand-black'
            }`}
          >
            Active ({activeCount})
          </button>
          <button
            type="button"
            onClick={() => setFilterMode('hidden')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
              filterMode === 'hidden'
                ? 'bg-brand-white text-brand-black shadow-xs'
                : 'text-brand-gray-600 hover:text-brand-black'
            }`}
          >
            Hidden ({hiddenCount})
          </button>
        </div>
      </div>

      {/* Banners List */}
      <div className="space-y-3">
        {filteredBanners.length === 0 ? (
          <div className="bg-brand-white rounded-2xl border border-dashed border-brand-gray-300 p-12 text-center">
            <ImageIcon className="w-10 h-10 text-brand-gray-400 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-brand-black mb-1">No banners found</h3>
            <p className="text-xs text-brand-gray-500 mb-4">
              {searchQuery ? 'Try clearing your search query.' : 'Add your first hero banner to showcase.'}
            </p>
            {searchQuery ? (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="text-xs font-semibold text-brand-gold hover:underline"
              >
                Clear Search
              </button>
            ) : (
              <button
                type="button"
                onClick={handleOpenAddModal}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-brand-gold text-brand-black hover:bg-brand-gold-dark transition-colors"
              >
                + Add Banner
              </button>
            )}
          </div>
        ) : (
          filteredBanners.map((banner, index) => {
            const isFirst = index === 0;
            const isLast = index === banners.length - 1;
            const isBannerFeatured = Boolean(
              banner.isFeatured || 
              banner.id?.includes('diwali') || 
              banner.image?.includes('diwali') || 
              banner.image?.includes('file_000000002410821198a81a83a16d503f')
            );

            return (
              <motion.div
                key={banner.id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className={`bg-brand-white rounded-2xl border transition-all p-3 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                  isBannerFeatured
                    ? 'border-amber-400/90 ring-1 ring-amber-400/50 shadow-[0_0_20px_rgba(245,158,11,0.18)] bg-gradient-to-r from-amber-500/5 to-transparent'
                    : banner.isActive !== false
                    ? 'border-brand-gray-200 hover:border-brand-gold/40 shadow-xs'
                    : 'border-brand-gray-200/60 bg-brand-gray-50/70 opacity-75'
                }`}
              >
                {/* Left: Reorder controls + Thumbnail + Details */}
                <div className="flex items-center gap-3.5 flex-1 min-w-0 w-full sm:w-auto">
                  {/* Order Rank & Arrow Buttons */}
                  <div className="flex flex-col items-center justify-center gap-1 shrink-0">
                    <button
                      type="button"
                      disabled={isFirst}
                      onClick={() => handleMoveUp(index)}
                      className={`p-1 rounded-md text-brand-gray-500 transition-colors ${
                        isFirst
                          ? 'opacity-30 cursor-not-allowed'
                          : 'hover:bg-brand-gray-100 hover:text-brand-black cursor-pointer'
                      }`}
                      title="Move slide up"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-[11px] font-mono font-bold text-brand-gray-600 bg-brand-gray-100 px-1.5 py-0.5 rounded">
                      #{index + 1}
                    </span>
                    <button
                      type="button"
                      disabled={isLast}
                      onClick={() => handleMoveDown(index)}
                      className={`p-1 rounded-md text-brand-gray-500 transition-colors ${
                        isLast
                          ? 'opacity-30 cursor-not-allowed'
                          : 'hover:bg-brand-gray-100 hover:text-brand-black cursor-pointer'
                      }`}
                      title="Move slide down"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* 16:9 Thumbnail Preview */}
                  <div
                    className={`relative w-28 sm:w-36 aspect-[16/9] rounded-xl overflow-hidden bg-stone-900 shrink-0 ${
                      isBannerFeatured ? 'ring-2 ring-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.35)]' : 'border border-brand-gray-200'
                    }`}
                  >
                    <img
                      src={banner.image}
                      alt={banner.alt}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    <span
                      className={`absolute bottom-1 left-1.5 text-[9px] font-semibold px-1.5 py-0.5 rounded uppercase tracking-wider backdrop-blur-xs ${
                        isBannerFeatured ? 'bg-amber-950/85 text-amber-200 border border-amber-400/50' : 'bg-black/70 text-white'
                      }`}
                    >
                      {banner.badge}
                    </span>
                  </div>

                  {/* Title & Copy */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h4 className="font-serif font-bold text-sm sm:text-base text-brand-black truncate">
                        {banner.title}
                      </h4>
                      {isBannerFeatured && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-900 border border-amber-300 shadow-xs">
                          <Sparkles className="w-2.5 h-2.5 text-amber-600" />
                          Featured Spotlight
                        </span>
                      )}
                      {banner.isActive !== false ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-stone-100 text-stone-600 border border-stone-200">
                          <EyeOff className="w-2.5 h-2.5" />
                          Hidden
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-brand-gray-500 line-clamp-1 mb-1">
                      {banner.subtitle}
                    </p>
                    <p className="text-[10px] font-mono text-brand-gray-400 truncate max-w-[280px]">
                      {banner.image}
                    </p>
                  </div>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-2 self-end sm:self-center shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 w-full sm:w-auto justify-end">
                  <button
                    type="button"
                    onClick={() => handleToggleActive(banner.id)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors cursor-pointer ${
                      banner.isActive !== false
                        ? 'bg-brand-white text-brand-gray-700 border-brand-gray-300 hover:bg-brand-gray-50'
                        : 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                    }`}
                    title={banner.isActive !== false ? 'Hide from storefront' : 'Show on storefront'}
                  >
                    {banner.isActive !== false ? (
                      <>
                        <EyeOff className="w-3.5 h-3.5 text-brand-gray-500" />
                        <span className="hidden sm:inline">Hide</span>
                      </>
                    ) : (
                      <>
                        <Eye className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="hidden sm:inline">Show</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleOpenEditModal(banner)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-brand-white text-brand-gray-700 border border-brand-gray-300 hover:bg-brand-gray-50 transition-colors cursor-pointer"
                  >
                    <Edit2 className="w-3.5 h-3.5 text-brand-gray-500" />
                    <span>Edit</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDelete(banner)}
                    className="inline-flex items-center gap-1.5 p-1.5 sm:px-3 sm:py-1.5 rounded-xl text-xs font-medium text-red-600 hover:bg-red-50 border border-transparent hover:border-red-200 transition-colors cursor-pointer"
                    title="Delete banner"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Delete</span>
                  </button>
                </div>
              </motion.div>
            );
          })
        )}
      </div>

      {/* Add / Edit Banner Modal Dialog */}
      <AnimatePresence>
        {isModalOpen && editingBanner && (
          <div className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              className="bg-brand-white w-full max-w-2xl rounded-2xl shadow-2xl border border-brand-gray-200 overflow-hidden my-8"
            >
              {/* Modal Header */}
              <div className="p-5 border-b border-brand-gray-200 flex items-center justify-between">
                <div>
                  <h3 className="font-serif font-bold text-lg text-brand-black">
                    {editingBanner.id ? 'Edit Hero Banner' : 'Add New Hero Banner'}
                  </h3>
                  <p className="text-xs text-brand-gray-500">
                    Customize the banner headline, visual image, badge, and storefront presence.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="p-1.5 rounded-full hover:bg-brand-gray-100 text-brand-gray-500 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Form Content */}
              <form onSubmit={handleSaveModal} className="p-5 space-y-5 max-h-[75vh] overflow-y-auto custom-scrollbar">
                {/* Live Card Preview Box */}
                <div>
                  <label className="block text-xs font-semibold text-brand-gray-700 uppercase tracking-wider mb-2">
                    Live Preview
                  </label>
                  <div className="relative aspect-[16/9] sm:aspect-[21/9] max-h-[200px] rounded-xl overflow-hidden bg-stone-900 border border-brand-gray-300 shadow-sm">
                    <img
                      src={editingBanner.image || '/banners/02_Indian_Fruits_Original.png'}
                      alt={editingBanner.alt || 'Preview banner'}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = '/banners/02_Indian_Fruits_Original.png';
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-black/10" />
                    <div className="absolute top-3 left-3">
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-black/60 text-[#F5E6D3] border border-white/20">
                        {editingBanner.badge || 'Seasonal Harvest'}
                      </span>
                    </div>
                    <div className="absolute bottom-3 left-4 right-4">
                      <h4 className="font-serif text-sm sm:text-base font-bold text-white drop-shadow">
                        {editingBanner.title || 'Banner Headline'}
                      </h4>
                      <p className="text-xs text-stone-300 drop-shadow line-clamp-1">
                        {editingBanner.subtitle || 'Banner description text'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Banner Image Source Picker */}
                <div className="space-y-3">
                  <label className="block text-xs font-semibold text-brand-gray-700 uppercase tracking-wider">
                    Banner Image Source
                  </label>
                  <div className="flex items-center gap-1 bg-brand-gray-100 p-1 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setImageSourceTab('presets')}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                        imageSourceTab === 'presets'
                          ? 'bg-brand-white text-brand-black shadow-xs'
                          : 'text-brand-gray-600 hover:text-brand-black'
                      }`}
                    >
                      Curated Library (10 Presets)
                    </button>
                    <button
                      type="button"
                      onClick={() => setImageSourceTab('upload')}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                        imageSourceTab === 'upload'
                          ? 'bg-brand-white text-brand-black shadow-xs'
                          : 'text-brand-gray-600 hover:text-brand-black'
                      }`}
                    >
                      Upload Image
                    </button>
                    <button
                      type="button"
                      onClick={() => setImageSourceTab('url')}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                        imageSourceTab === 'url'
                          ? 'bg-brand-white text-brand-black shadow-xs'
                          : 'text-brand-gray-600 hover:text-brand-black'
                      }`}
                    >
                      Custom URL
                    </button>
                  </div>

                  {/* Presets Grid */}
                  {imageSourceTab === 'presets' && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 p-3 bg-brand-gray-50 rounded-xl border border-brand-gray-200 max-h-48 overflow-y-auto custom-scrollbar">
                      {PRESET_BANNER_IMAGES.map((preset) => {
                        const isSelected = editingBanner.image === preset.url;
                        return (
                          <button
                            key={preset.id}
                            type="button"
                            onClick={() => handleSelectPreset(preset)}
                            className={`group relative text-left rounded-lg overflow-hidden border p-1 transition-all cursor-pointer ${
                              isSelected
                                ? 'border-brand-gold ring-2 ring-brand-gold bg-brand-white'
                                : 'border-brand-gray-200 bg-brand-white hover:border-brand-gray-400'
                            }`}
                          >
                            <div className="aspect-[16/9] rounded overflow-hidden bg-stone-900 mb-1 relative">
                              <img
                                src={preset.url}
                                alt={preset.label}
                                className="w-full h-full object-cover"
                              />
                              {isSelected && (
                                <div className="absolute top-1 right-1 bg-brand-gold text-brand-black rounded-full p-0.5 shadow">
                                  <Check className="w-3 h-3 stroke-[3]" />
                                </div>
                              )}
                            </div>
                            <p className="text-[10px] font-medium text-brand-black truncate">
                              {preset.label}
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Upload Image Dropzone */}
                  {imageSourceTab === 'upload' && (
                    <div className="p-4 bg-brand-gray-50 rounded-xl border border-brand-gray-200 space-y-3">
                      <div className="border-2 border-dashed border-brand-gray-300 rounded-xl p-6 text-center hover:border-brand-gold transition-colors">
                        <UploadCloud className="w-8 h-8 text-brand-gray-400 mx-auto mb-2" />
                        <p className="text-xs font-medium text-brand-black mb-1">
                          Drop image here or click to browse
                        </p>
                        <p className="text-[10px] text-brand-gray-500 mb-3">
                          PNG, JPG, WebP up to 10MB (recommended aspect ratio: 16:9)
                        </p>
                        <label className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold bg-brand-black text-brand-white hover:bg-brand-gray-800 cursor-pointer">
                          <span>Select Image File</span>
                          <input
                            type="file"
                            accept="image/png, image/jpeg, image/webp"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleFileUpload(file);
                            }}
                          />
                        </label>
                      </div>

                      {isUploading && (
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs text-brand-gray-500">
                            <span>Uploading image...</span>
                            <span>{uploadProgress}%</span>
                          </div>
                          <div className="w-full h-1.5 bg-brand-gray-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-brand-gold transition-all duration-300"
                              style={{ width: `${uploadProgress}%` }}
                            />
                          </div>
                        </div>
                      )}

                      {uploadError && (
                        <p className="text-xs text-red-600 bg-red-50 p-2 rounded-lg border border-red-200">
                          {uploadError}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Custom URL Input */}
                  {imageSourceTab === 'url' && (
                    <div className="p-4 bg-brand-gray-50 rounded-xl border border-brand-gray-200 space-y-2">
                      <input
                        type="url"
                        placeholder="https://example.com/images/banner.jpg"
                        value={editingBanner.image}
                        onChange={(e) =>
                          setEditingBanner({ ...editingBanner, image: e.target.value })
                        }
                        className="w-full px-3 py-2 bg-brand-white border border-brand-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-brand-gold/50"
                      />
                      <p className="text-[10px] text-brand-gray-500">
                        Paste a direct link to any high-resolution image file.
                      </p>
                    </div>
                  )}
                </div>

                {/* Badge & Suggestions */}
                <div>
                  <label className="block text-xs font-semibold text-brand-gray-700 uppercase tracking-wider mb-1.5">
                    Category / Seasonal Badge
                  </label>
                  <input
                    type="text"
                    required
                    value={editingBanner.badge}
                    onChange={(e) =>
                      setEditingBanner({ ...editingBanner, badge: e.target.value })
                    }
                    placeholder="e.g. Seasonal Harvest, Shore Catch, Pure Wellness"
                    className="w-full px-3.5 py-2.5 bg-brand-white border border-brand-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-gold/50 font-medium"
                  />
                  {/* Badge Suggestions */}
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {BADGE_SUGGESTIONS.map((sug) => (
                      <button
                        key={sug}
                        type="button"
                        onClick={() =>
                          setEditingBanner({ ...editingBanner, badge: sug })
                        }
                        className={`text-[10px] px-2 py-0.5 rounded-md border transition-colors cursor-pointer ${
                          editingBanner.badge === sug
                            ? 'bg-brand-gold/20 text-brand-black border-brand-gold font-semibold'
                            : 'bg-brand-gray-50 text-brand-gray-600 border-brand-gray-200 hover:bg-brand-gray-100'
                        }`}
                      >
                        {sug}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Headline Title */}
                <div>
                  <label className="block text-xs font-semibold text-brand-gray-700 uppercase tracking-wider mb-1.5">
                    Headline Title
                  </label>
                  <input
                    type="text"
                    required
                    value={editingBanner.title}
                    onChange={(e) =>
                      setEditingBanner({ ...editingBanner, title: e.target.value })
                    }
                    placeholder="e.g. Indian Farm-Fresh Fruits"
                    className="w-full px-3.5 py-2.5 bg-brand-white border border-brand-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-gold/50 font-semibold"
                  />
                </div>

                {/* Subtitle */}
                <div>
                  <label className="block text-xs font-semibold text-brand-gray-700 uppercase tracking-wider mb-1.5">
                    Subtitle / Description
                  </label>
                  <input
                    type="text"
                    value={editingBanner.subtitle}
                    onChange={(e) =>
                      setEditingBanner({ ...editingBanner, subtitle: e.target.value })
                    }
                    placeholder="e.g. Sun-ripened, naturally sweet & 100% hand-selected"
                    className="w-full px-3.5 py-2.5 bg-brand-white border border-brand-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-gold/50"
                  />
                </div>

                {/* Alt Text */}
                <div>
                  <label className="block text-xs font-semibold text-brand-gray-700 uppercase tracking-wider mb-1.5">
                    Alt Text (Accessibility & SEO)
                  </label>
                  <input
                    type="text"
                    value={editingBanner.alt}
                    onChange={(e) =>
                      setEditingBanner({ ...editingBanner, alt: e.target.value })
                    }
                    placeholder="Descriptive text for screen readers"
                    className="w-full px-3.5 py-2.5 bg-brand-white border border-brand-gray-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-brand-gold/50"
                  />
                </div>

                {/* Visibility Switch */}
                <div className="flex items-center justify-between p-3.5 bg-brand-gray-50 rounded-xl border border-brand-gray-200">
                  <div>
                    <p className="text-xs font-semibold text-brand-black">Active on Storefront</p>
                    <p className="text-[11px] text-brand-gray-500">
                      When enabled, this banner will cycle through the customer homepage slideshow.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editingBanner.isActive}
                      onChange={(e) =>
                        setEditingBanner({ ...editingBanner, isActive: e.target.checked })
                      }
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-brand-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-brand-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                  </label>
                </div>

                {/* Featured Festive Highlight Switch */}
                <div className="flex items-center justify-between p-3.5 bg-amber-500/10 rounded-xl border border-amber-400/40">
                  <div className="pr-4">
                    <div className="flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-amber-600" />
                      <p className="text-xs font-semibold text-amber-950">Featured Festive Highlight</p>
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-amber-500/20 text-amber-800 border border-amber-400/40">
                        Luminous Amber
                      </span>
                    </div>
                    <p className="text-[11px] text-amber-900/80 mt-0.5">
                      Highlights with a glowing amber frame, festive badge, and repeats cyclically every 2-3 slides in the hero showcase.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      checked={Boolean(editingBanner.isFeatured)}
                      onChange={(e) =>
                        setEditingBanner({
                          ...editingBanner,
                          isFeatured: e.target.checked,
                          highlightTone: e.target.checked ? 'amber' : 'none',
                        })
                      }
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-brand-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-brand-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
                  </label>
                </div>

                {/* Modal Footer */}
                <div className="pt-3 border-t border-brand-gray-200 flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs font-medium text-brand-gray-700 hover:bg-brand-gray-100 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-5 py-2 rounded-xl text-xs font-semibold bg-brand-gold hover:bg-brand-gold-dark text-brand-black transition-colors shadow-sm flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isSaving && <span className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-brand-black" />}
                    <span>{editingBanner.id ? 'Save Changes' : 'Add Banner'}</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
