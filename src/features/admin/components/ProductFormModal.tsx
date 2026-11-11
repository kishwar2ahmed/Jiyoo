import React from 'react';
import { X } from 'lucide-react';
import { Category, Product } from '../../../types';
import { ImageUpload } from './ImageUpload';
import { MultiImageUpload } from './MultiImageUpload';

interface ProductFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingProduct: Partial<Product> | null;
  setEditingProduct: React.Dispatch<React.SetStateAction<Partial<Product> | null>>;
  categoriesList: Category[];
  onSubmit: (e: React.FormEvent) => Promise<void> | void;
}

export function ProductFormModal({
  isOpen,
  onClose,
  editingProduct,
  setEditingProduct,
  categoriesList,
  onSubmit,
}: ProductFormModalProps) {
  if (!isOpen || !editingProduct) return null;

  const updateField = (key: keyof Product, value: any) => {
    setEditingProduct((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-xl border border-brand-gray-200 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="p-5 border-b border-brand-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-bold text-brand-black">
            {editingProduct.id ? `Edit Product: ${editingProduct.name}` : 'Add New Product'}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-brand-gray-500 hover:text-brand-black hover:bg-brand-gray-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="p-6 overflow-y-auto space-y-5 flex-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-brand-gray-700 mb-1">
                Product Name *
              </label>
              <input
                type="text"
                required
                value={editingProduct.name || ''}
                onChange={(e) => updateField('name', e.target.value)}
                className="w-full px-3.5 py-2 border border-brand-gray-300 rounded-lg text-sm"
                placeholder="e.g. Apple Royal Gala Premium"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-brand-gray-700 mb-1">
                Category *
              </label>
              <select
                value={editingProduct.categoryId || editingProduct.category || 'fruits'}
                onChange={(e) => {
                  updateField('categoryId', e.target.value);
                  updateField('category', e.target.value);
                }}
                className="w-full px-3.5 py-2 border border-brand-gray-300 rounded-lg text-sm bg-white"
              >
                {categoriesList.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-brand-gray-700 mb-1">
                Selling Price (₹) *
              </label>
              <input
                type="number"
                required
                min="0"
                value={
                  editingProduct.numericPrice ??
                  (typeof editingProduct.price === 'number'
                    ? editingProduct.price
                    : parseFloat(String(editingProduct.price || '0').replace(/[^0-9.]/g, '')) || 0)
                }
                onChange={(e) => {
                  const val = Number(e.target.value) || 0;
                  updateField('price', val);
                  updateField('numericPrice', val);
                }}
                className="w-full px-3.5 py-2 border border-brand-gray-300 rounded-lg text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-brand-gray-700 mb-1">
                Unit / Weight Label
              </label>
              <input
                type="text"
                value={editingProduct.unit || ''}
                onChange={(e) => updateField('unit', e.target.value)}
                className="w-full px-3.5 py-2 border border-brand-gray-300 rounded-lg text-sm"
                placeholder="e.g. 1 kg or 4 Pack"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-brand-gray-700 mb-1">
                Stock Quantity
              </label>
              <input
                type="number"
                min="0"
                value={editingProduct.stock ?? 100}
                onChange={(e) => updateField('stock', Number(e.target.value))}
                className="w-full px-3.5 py-2 border border-brand-gray-300 rounded-lg text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-brand-gray-700 mb-1">
                Stock Status
              </label>
              <select
                value={editingProduct.stockStatus || 'in_stock'}
                onChange={(e) =>
                  updateField('stockStatus', e.target.value as 'in_stock' | 'out_of_stock')
                }
                className="w-full px-3.5 py-2 border border-brand-gray-300 rounded-lg text-sm bg-white"
              >
                <option value="in_stock">In Stock</option>
                <option value="out_of_stock">Out of Stock</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-brand-gray-700 mb-1">
              Description
            </label>
            <textarea
              rows={3}
              value={editingProduct.description || ''}
              onChange={(e) => updateField('description', e.target.value)}
              className="w-full px-3.5 py-2 border border-brand-gray-300 rounded-lg text-sm"
            />
          </div>

          <ImageUpload
            label="Primary Product Image"
            value={editingProduct.image || ''}
            onChange={(url) => updateField('image', url)}
            storagePathPrefix="product_primary"
          />

          <MultiImageUpload
            label="Additional Gallery Images"
            value={editingProduct.images || []}
            onChange={(urls) => updateField('images', urls)}
            storagePath="product_gallery"
          />

          <div className="border-t border-brand-gray-200 pt-4">
            <label className="flex items-center gap-2 text-sm font-medium text-brand-black">
              <input
                type="checkbox"
                checked={Boolean(editingProduct.wholesaleEligible)}
                onChange={(e) => updateField('wholesaleEligible', e.target.checked)}
                className="rounded border-brand-gray-300"
              />
              Enable for Wholesale Pan-India Box Catalog
            </label>
            {editingProduct.wholesaleEligible && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
                <div>
                  <label className="block text-xs text-brand-gray-600 mb-1">
                    Wholesale Box Price (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={editingProduct.wholesalePrice || ''}
                    onChange={(e) => updateField('wholesalePrice', Number(e.target.value) || 0)}
                    className="w-full px-3 py-1.5 border border-brand-gray-300 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-brand-gray-600 mb-1">Wholesale Unit</label>
                  <input
                    type="text"
                    value={editingProduct.wholesaleUnit || '1 Box (10 kg)'}
                    onChange={(e) => updateField('wholesaleUnit', e.target.value)}
                    className="w-full px-3 py-1.5 border border-brand-gray-300 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-brand-gray-600 mb-1">Min Order Boxes</label>
                  <input
                    type="number"
                    min="1"
                    value={editingProduct.wholesaleMinQty || 1}
                    onChange={(e) => updateField('wholesaleMinQty', Number(e.target.value) || 1)}
                    className="w-full px-3 py-1.5 border border-brand-gray-300 rounded-lg text-sm"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-brand-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-brand-gray-300 text-sm font-medium text-brand-gray-700 hover:bg-brand-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-brand-black text-white text-sm font-semibold hover:bg-brand-gray-900"
            >
              Save Product
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
