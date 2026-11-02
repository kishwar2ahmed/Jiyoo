import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';
import { Product, Category } from '../../../types';
import { ImageUpload } from './ImageUpload';
import { MultiImageUpload } from './MultiImageUpload';

interface ProductFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingProduct: Partial<Product> | null;
  setEditingProduct: React.Dispatch<React.SetStateAction<Partial<Product> | null>>;
  categoriesList: Category[];
  onSubmit: (e: React.FormEvent) => void;
}

export function ProductFormModal({
  isOpen,
  onClose,
  editingProduct,
  setEditingProduct,
  categoriesList,
  onSubmit,
}: ProductFormModalProps) {
  const [isSaving, setIsSaving] = React.useState(false);
  
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onSubmit(e);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen || !editingProduct) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-6 my-8"
        >
          <div className="flex items-center justify-between border-b pb-4 border-brand-gray-100">
            <h3 className="text-xl font-bold text-brand-black">
              {editingProduct.id ? 'Edit Product' : 'Add New Product'}
            </h3>
            <button
              onClick={onClose}
              className="text-brand-gray-400 hover:text-brand-black p-2 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form id="productForm" onSubmit={handleFormSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-brand-gray-700 mb-1">Product Name *</label>
                <input
                  type="text"
                  required
                  value={editingProduct.name || ''}
                  onChange={(e) => setEditingProduct((prev) => ({ ...prev, name: e.target.value }))}
                  className="w-full bg-brand-gray-50 border border-brand-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-emerald-600"
                  placeholder="Fresh Tiger Prawns"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-brand-gray-700 mb-1">Category *</label>
                <select
                  required
                  value={editingProduct.categoryId || ''}
                  onChange={(e) =>
                    setEditingProduct((prev) => ({
                      ...prev,
                      categoryId: e.target.value,
                      category: categoriesList.find((c) => c.id === e.target.value)?.label || e.target.value,
                    }))
                  }
                  className="w-full bg-brand-gray-50 border border-brand-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-emerald-600"
                >
                  <option value="">Select Category</option>
                  {categoriesList.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-brand-gray-700 mb-1">Price (₹) *</label>
                <input
                  type="number"
                  required
                  value={editingProduct.price ?? ''}
                  onChange={(e) =>
                    setEditingProduct((prev) => ({
                      ...prev,
                      price: Number(e.target.value),
                      numericPrice: Number(e.target.value),
                    }))
                  }
                  className="w-full bg-brand-gray-50 border border-brand-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-emerald-600"
                  placeholder="299"
                />
              </div>

              <div className="sm:col-span-2 border border-amber-200 bg-amber-50/50 rounded-lg p-3 space-y-3">
                <label className="flex items-center gap-2 text-sm font-semibold text-amber-900">
                  <input
                    type="checkbox"
                    checked={!!editingProduct.wholesaleEligible}
                    onChange={(e) => setEditingProduct((prev) => ({ ...prev, wholesaleEligible: e.target.checked }))}
                    className="rounded border-amber-300"
                  />
                  Eligible for wholesale (bulk, pan-India shipping)
                </label>
                {editingProduct.wholesaleEligible && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-amber-800 mb-1">Wholesale Price (₹)</label>
                      <input
                        type="number"
                        value={editingProduct.wholesalePrice ?? ''}
                        onChange={(e) => setEditingProduct((prev) => ({ ...prev, wholesalePrice: Number(e.target.value) }))}
                        className="w-full bg-white border border-amber-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-600"
                        placeholder="e.g. 45"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-amber-800 mb-1">Wholesale Unit</label>
                      <input
                        type="text"
                        value={editingProduct.wholesaleUnit || ''}
                        onChange={(e) => setEditingProduct((prev) => ({ ...prev, wholesaleUnit: e.target.value }))}
                        className="w-full bg-white border border-amber-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-600"
                        placeholder="per kg, per crate"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-amber-800 mb-1">Min. Wholesale Qty</label>
                      <input
                        type="number"
                        value={editingProduct.wholesaleMinQty ?? ''}
                        onChange={(e) => setEditingProduct((prev) => ({ ...prev, wholesaleMinQty: Number(e.target.value) }))}
                        className="w-full bg-white border border-amber-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-600"
                        placeholder="e.g. 10"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-brand-gray-700 mb-1">Unit / Weight Badge</label>
                <input
                  type="text"
                  value={editingProduct.unit || ''}
                  onChange={(e) => setEditingProduct((prev) => ({ ...prev, unit: e.target.value }))}
                  className="w-full bg-brand-gray-50 border border-brand-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-emerald-600"
                  placeholder="500g or 1 kg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-brand-gray-700 mb-1">Freshness Badge</label>
                <input
                  type="text"
                  value={editingProduct.freshnessBadge || ''}
                  onChange={(e) => setEditingProduct((prev) => ({ ...prev, freshnessBadge: e.target.value }))}
                  className="w-full bg-brand-gray-50 border border-brand-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-emerald-600"
                  placeholder="Daily Catch, Organic, etc."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-brand-gray-700 mb-1">Stock Quantity</label>
                <input
                  type="number"
                  value={editingProduct.stock ?? 100}
                  onChange={(e) => setEditingProduct((prev) => ({ ...prev, stock: Number(e.target.value) }))}
                  className="w-full bg-brand-gray-50 border border-brand-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-emerald-600"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-brand-gray-700 mb-1">Description</label>
              <textarea
                rows={3}
                value={editingProduct.description || ''}
                onChange={(e) => setEditingProduct((prev) => ({ ...prev, description: e.target.value }))}
                className="w-full bg-brand-gray-50 border border-brand-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-emerald-600"
                placeholder="Product description and details..."
              />
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-brand-gray-700 mb-1">Image URL (Optional Direct Link)</label>
                <input
                  type="url"
                  value={editingProduct.image && !editingProduct.image.startsWith('data:') && !editingProduct.image.startsWith('/api/images/') ? editingProduct.image : ''}
                  onChange={(e) => setEditingProduct((prev) => ({ ...prev, image: e.target.value }))}
                  className="w-full bg-brand-gray-50 border border-brand-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-emerald-600"
                  placeholder="https://images.unsplash.com/... or paste image URL"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-brand-gray-700 mb-1">Or Upload Image File</label>
                <ImageUpload
                  label="Product Image Upload"
                  value={editingProduct.image || null}
                  onChange={(url) => setEditingProduct((prev) => ({ ...prev, image: url || '' }))}
                  storagePath="product_images"
                />
              </div>

              <div className="pt-2 border-t border-brand-gray-100">
                <MultiImageUpload
                  label="Additional Gallery Photos (optional)"
                  value={editingProduct.images || []}
                  onChange={(urls) => setEditingProduct((prev) => ({ ...prev, images: urls }))}
                  storagePath="product_gallery"
                  max={6}
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-brand-gray-100">
              <button
                type="button"
                onClick={onClose}
                disabled={isSaving}
                className="px-4 py-2 text-sm font-medium text-brand-gray-600 hover:bg-brand-gray-100 rounded-lg transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-4 py-2 text-sm font-medium bg-brand-black text-white rounded-lg hover:bg-brand-gray-900 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? 'Saving…' : 'Save Product'}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
