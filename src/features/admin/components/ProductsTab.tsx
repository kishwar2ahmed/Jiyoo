import { ProductFormModal } from './ProductFormModal';
import { useState, useEffect, useMemo } from 'react';
import { collection, doc, setDoc, onSnapshot, writeBatch, query, limit } from 'firebase/firestore';

import { db } from '../../../services/firebase';
import { Category, Product } from '../../../types';
import { CATEGORIES, PRODUCTS } from '../../../constants/data';
import { Plus, Edit2, Trash2, Search, Image as ImageIcon, Database, PackageX } from 'lucide-react';
import { useToast } from '../../core/contexts/ToastContext';
import { useConfirm } from '../../core/contexts/ConfirmContext';
import { resolveProductImage } from '../../../utils/imageUtils';
import { InstaBlueTickIcon } from '../../core/components/SocialIcons';


import React from 'react';
const ProductRow = React.memo(({ p, setEditingProduct, setIsModalOpen, handleDelete, handleToggleStock }: { p: Product, setEditingProduct: any, setIsModalOpen: any, handleDelete: any, handleToggleStock: any }) => {
  const isOutOfStock = p.stockStatus === 'out_of_stock';
  return (
  <tr className="border-b border-brand-gray-100 hover:bg-brand-gray-50 transition-colors">
    <td className="px-4 py-3 flex items-center gap-3">
      <div className="w-10 h-10 rounded overflow-hidden bg-brand-gray-200 shrink-0">
        {p.image ? (
          <img src={p.image} alt={p.name} loading="lazy" className="w-full h-full object-contain bg-white" />
        ) : (
          <ImageIcon className="w-5 h-5 m-auto text-brand-gray-400 mt-2.5" />
        )}
      </div>
      <span className="font-medium text-brand-black">{p.name}</span>
    </td>
    <td className="px-4 py-3 text-brand-gray-600 capitalize">{p.categoryId}</td>
    <td className="px-4 py-3 text-brand-gray-600">₹{p.price} / {p.unit}</td>
    <td className="px-4 py-3">
      <button
        onClick={() => handleToggleStock(p)}
        title={isOutOfStock ? 'Mark as in stock' : 'Mark as out of stock'}
        className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full transition-colors ${
          isOutOfStock
            ? 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200'
            : 'bg-sky-50 text-slate-900 hover:bg-sky-100 border border-sky-200'
        }`}
      >
        {isOutOfStock ? <PackageX className="w-3.5 h-3.5" /> : <InstaBlueTickIcon className="w-3.5 h-3.5 shrink-0" />}
        {isOutOfStock ? 'Out of Stock' : 'In Stock'}
      </button>
    </td>
    <td className="px-4 py-3 text-right">
      <button 
        onClick={() => { setEditingProduct(p); setIsModalOpen(true); }}
        className="text-blue-600 hover:bg-blue-50 p-2 rounded-lg transition-colors mr-2"
      >
        <Edit2 className="w-4 h-4" />
      </button>
      <button 
        onClick={() => handleDelete(String(p.id))}
        className="text-red-600 hover:bg-red-50 p-2 rounded-lg transition-colors"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </td>
  </tr>
  );
});

export function ProductsTab() {
  const { showToast } = useToast();
  const confirm = useConfirm();
  const [products, setProducts] = useState<Product[]>(() => PRODUCTS);
  const [categoriesList, setCategoriesList] = useState<Category[]>(CATEGORIES);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Partial<Product> | null>(null);
  
  useEffect(() => {
    // Failsafe timer to stop loading spinner after 800ms
    const timer = setTimeout(() => {
      setLoading(false);
    }, 800);

    // Real-time categories snapshot
    const unsubCats = onSnapshot(collection(db, 'categories'), (snap) => {
      const loaded: Category[] = [];
      snap.forEach(d => {
        loaded.push({ id: d.id, ...d.data() } as Category);
      });
      const catMap = new Map<string, Category>();
      CATEGORIES.forEach(c => catMap.set(c.id, c));
      loaded.forEach(c => {
        if ((c as any).isDeleted) {
          catMap.delete(c.id);
        } else {
          catMap.set(c.id, c);
        }
      });
      setCategoriesList(Array.from(catMap.values()));
    }, (err) => {
      console.warn("Categories subscription error:", err);
    });

    // Real-time products snapshot
    const unsubProds = onSnapshot(query(collection(db, 'products'), limit(500)), (snap) => {
      if (snap.empty) {
        setProducts(PRODUCTS);
      } else {
        const prodMap = new Map<string, Product>();
        PRODUCTS.forEach(p => prodMap.set(String(p.id), p));
        snap.forEach(d => {
          const data = d.data();
          if (data.isDeleted) {
            prodMap.delete(d.id);
          } else {
            prodMap.set(d.id, { id: d.id, ...data, image: resolveProductImage(data.image) || '' } as Product);
          }
        });
        setProducts(Array.from(prodMap.values()));
      }
      setLoading(false);
    }, (err) => {
      console.warn("Products subscription error:", err);
      setProducts(PRODUCTS);
      setLoading(false);
    });

    return () => {
      clearTimeout(timer);
      unsubCats();
      unsubProds();
    };
  }, []);

  const handleSeedCatalog = async () => {
    if (!(await confirm({ title: "Sync catalog?", message: "Sync all products from source to update images and data?", danger: false, confirmLabel: "Sync" }))) return;
    setLoading(true);
    try {
      let batch = writeBatch(db);
      let count = 0;
      for (const p of PRODUCTS) {
        batch.set(doc(db, 'products', String(p.id)), p);
        count++;
        if (count % 400 === 0) {
          await batch.commit();
          batch = writeBatch(db);
        }
      }
      if (count % 400 !== 0) {
        await batch.commit();
      }
      showToast("Sample catalog seeded successfully!", "success");
    } catch (err) {
      console.error("Error seeding catalog:", err);
      showToast("Failed to seed catalog.", "error");
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct?.name || editingProduct?.price === undefined || !editingProduct?.categoryId) {
      showToast("Please fill in Name, Category, and Price.", "error");
      return;
    }
    
    const id = editingProduct.id || Math.random().toString(36).substring(2, 9);
    const selectedCategoryObj = categoriesList.find(c => c.id === editingProduct.categoryId);
    
    const rawPayload = { 
      ...editingProduct, 
      id: String(id), 
      category: selectedCategoryObj?.label || editingProduct.category || editingProduct.categoryId,
      isDeleted: false 
    } as Product;
    
    // Remove undefined values to prevent Firestore crashes
    const payload = Object.fromEntries(Object.entries(rawPayload).filter(([_, v]) => v !== undefined)) as Product;
    
    setIsModalOpen(false);
    setEditingProduct(null);
    
    try {
      await setDoc(doc(db, 'products', String(id)), payload);
    } catch (err) {
      console.warn("Could not sync product to Firestore:", err);
      showToast('Error updating product.', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    if (await confirm({ title: "Delete product?", message: "Are you sure you want to delete this product?" })) {
      try {
        await setDoc(doc(db, 'products', String(id)), { isDeleted: true }, { merge: true });
      } catch (err) {
        console.warn("Error deleting product from Firestore:", err);
        showToast('Error deleting product.', 'error');
      }
    }
  };

  const handleToggleStock = async (p: Product) => {
    const nextStatus = p.stockStatus === 'out_of_stock' ? 'in_stock' : 'out_of_stock';
    const previousProducts = products;
    setProducts(prev => prev.map(item => item.id === p.id ? { ...item, stockStatus: nextStatus } : item));
    try {
      await setDoc(doc(db, 'products', String(p.id)), { stockStatus: nextStatus }, { merge: true });
      showToast(nextStatus === 'out_of_stock' ? `"${p.name}" marked out of stock.` : `"${p.name}" marked in stock.`, 'success');
    } catch (err) {
      console.warn("Error toggling stock status:", err);
      setProducts(previousProducts);
      showToast('Failed to update stock status.', 'error');
    }
  };

  
  const filteredProducts = useMemo(() => {
    return products.filter(p => 
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.categoryId && p.categoryId.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [products, searchTerm]);

  const totalPages = useMemo(() => Math.ceil(filteredProducts.length / itemsPerPage), [filteredProducts.length, itemsPerPage]);
  
  const paginatedProducts = useMemo(() => {
    return filteredProducts.slice(
      (currentPage - 1) * itemsPerPage,
      currentPage * itemsPerPage
    );
  }, [filteredProducts, currentPage, itemsPerPage]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-brand-black">Products Management</h2>
          <p className="text-brand-gray-500">Add, edit, or remove products from your catalog.</p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={handleSeedCatalog}
            className="bg-emerald-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-emerald-700 transition-colors flex items-center gap-2"
          >
            <Database className="w-4 h-4" /> Sync Catalog Images
          </button>
          <button 
            onClick={() => {
              setEditingProduct({ tags: [], unit: 'kg', price: 0, stock: 0 });
              setIsModalOpen(true);
            }}
            className="bg-brand-black text-brand-white px-4 py-2 rounded-lg font-medium hover:bg-brand-gray-900 transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Add Product
          </button>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-brand-gray-200">
        <div className="relative max-w-md mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-gray-400" />
          <input 
            type="text"
            placeholder="Search products..."
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            className="w-full pl-9 pr-4 py-2 bg-brand-gray-50 border border-brand-gray-200 rounded-lg outline-none focus:border-emerald-600 text-sm"
          />
        </div>

        {loading ? (
          <div className="py-10 text-center text-brand-gray-500">Loading products...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-brand-gray-500 uppercase bg-brand-gray-50">
                <tr>
                  <th className="px-4 py-3 rounded-tl-lg">Product</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Price</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 rounded-tr-lg text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedProducts.map(p => (
                  <ProductRow key={p.id} p={p} setEditingProduct={setEditingProduct} setIsModalOpen={setIsModalOpen} handleDelete={handleDelete} handleToggleStock={handleToggleStock} />
                ))}
                {filteredProducts.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-brand-gray-500">
                      No products found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t border-brand-gray-100 bg-brand-gray-50 rounded-b-xl">
            <span className="text-sm text-brand-gray-500">
              Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredProducts.length)} of {filteredProducts.length} entries
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 rounded border border-brand-gray-200 bg-white text-sm disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 rounded border border-brand-gray-200 bg-white text-sm disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Edit/Add Modal */}
      <ProductFormModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        editingProduct={editingProduct}
        setEditingProduct={setEditingProduct}
        categoriesList={categoriesList}
        onSubmit={handleSave}
      />
    </div>
  );
}
