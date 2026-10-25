import React, { createContext, useContext, useState, useEffect } from 'react';
import { z } from 'zod';
import { CartProduct, AuthUser } from '../types';
import { auth, db, isFirebaseConfigured } from '../services/firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { onAuthStateChanged, signOut, getRedirectResult } from 'firebase/auth';

interface CartItem extends CartProduct {
  quantity: number;
}

export interface FlyingItem {
  id: string;
  image: string;
  startX: number;
  startY: number;
}

interface CartContextType {
  items: CartItem[];
  addToCart: (product: CartProduct, quantity?: number) => void;
  removeFromCart: (id: string | number) => void;
  updateQuantity: (id: string | number, quantity: number) => void;
  cartTotal: number;
  cartCount: number;
  clearCart: () => void;
  syncCartPrices: () => Promise<void>;
  user: AuthUser | null;
  logoutUser: () => void;
  isAuthLoading: boolean;
  searchQuery: string;
  wishlist: string[];
  toggleWishlist: (id: string) => void;
  setSearchQuery: (query: string) => void;
  addedItemToast: { id: string; name: string } | null;
  setAddedItemToast: (toast: { id: string; name: string } | null) => void;
  flyingItems: FlyingItem[];
  triggerFlyingItem: (item: Omit<FlyingItem, 'id'>) => void;
  removeFlyingItem: (id: string) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const getValidPrice = (item: any) => {
  const p1 = Number(item.numericPrice);
  if (!isNaN(p1) && p1 > 0) return p1;
  const p2 = parseFloat(String(item.price).replace(/[^0-9.]/g, ""));
  return isNaN(p2) ? 0 : p2;
};

// Zod schema for validating cart items from localStorage
const CartItemSchema = z.object({
  id: z.union([z.string(), z.number()]),
  quantity: z.number().int().positive(),
  name: z.string().min(1),
  price: z.union([z.string(), z.number()]),
  numericPrice: z.number().min(0).optional(),
  image: z.string().optional(),
  stock: z.number().optional(),
  stockStatus: z.string().optional(),
  selectedWeight: z.string().optional().nullable(),
  selectedCut: z.string().optional().nullable(),
}).passthrough(); // Allow additional fields for forward compatibility

const normalizeCartItem = (item: z.infer<typeof CartItemSchema>): CartItem => {
  const numericPrice = item.numericPrice ?? getValidPrice(item);
  return {
    ...item,
    numericPrice,
    image: item.image ?? '',
    selectedWeight: item.selectedWeight ?? undefined,
    selectedCut: item.selectedCut ?? undefined,
  } as CartItem;
};

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => {
    try {
      const local = localStorage.getItem('jiyoo_cart');
      if (!local) return [];
      const parsed = JSON.parse(local);
      // Validate cart data against schema to prevent prototype pollution and type issues
      return z.array(CartItemSchema).parse(parsed).map(normalizeCartItem);
    } catch (e) {
      // If validation fails, return empty cart (don't trust corrupted data)
      console.warn('Cart data validation failed, starting fresh:', (e as any).message);
      return [];
    }
  });
  useEffect(() => { localStorage.setItem('jiyoo_cart', JSON.stringify(items)); }, [items]);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [wishlist, setWishlist] = useState<string[]>(() => { try { const local = localStorage.getItem('jiyoo_wishlist'); return local ? JSON.parse(local) : []; } catch { return []; } });
  useEffect(() => { localStorage.setItem('jiyoo_wishlist', JSON.stringify(wishlist)); }, [wishlist]);
  const [addedItemToast, setAddedItemToast] = useState<{ id: string; name: string } | null>(null);
  const [flyingItems, setFlyingItems] = useState<FlyingItem[]>([]);

  const triggerFlyingItem = React.useCallback((item: Omit<FlyingItem, 'id'>) => {
    const id = Math.random().toString(36).substring(7);
    setFlyingItems(prev => [...prev, { ...item, id }]);
  }, []);


  const toggleWishlist = React.useCallback((id: string) => {
    setWishlist(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  }, []);

  const removeFlyingItem = React.useCallback((id: string) => {
    setFlyingItems(prev => prev.filter(item => item.id !== id));
  }, []);

  useEffect(() => {
    if (!isFirebaseConfigured) {
      setIsAuthLoading(false);
      return;
    }
    // Handle redirect result for mobile Safari / iOS
    let isMounted = true;
    const handleRedirectResult = async () => {
      try {
        const result = await getRedirectResult(auth);
        if (result && isMounted) {
          // User was redirected back from auth provider
          // Auth state will be handled by onAuthStateChanged below
        }
      } catch (err: any) {
        if (isMounted) {
          // Only log unexpected errors (popup closed by user is expected)
          if (err.code !== 'auth/popup-closed-by-user' && err.code !== 'auth/cancelled-popup-request') {
            console.warn("Redirect auth error:", err.message);
          }
        }
      }
    };
    handleRedirectResult();

    // Safety fallback if Firebase Auth is broken
    const fallbackTimeout = setTimeout(() => { setIsAuthLoading(false); }, 2000);
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => { 
      clearTimeout(fallbackTimeout);
      if (firebaseUser) {
        // Authoritative admin check: the server-controlled Firebase Auth
        // custom claim on this user's own verified ID token (see
        // syncAdminClaims() / POST /api/admin/users/:uid/role in server.ts).
        // Never derived from an email list or a Firestore field the client
        // itself can write.
        let isAdminClaim = false;
        try {
          const tokenResult = await firebaseUser.getIdTokenResult();
          isAdminClaim = tokenResult.claims.admin === true;
        } catch (claimErr) {
          console.warn("Could not read auth token claims:", claimErr);
        }

        const userData = {
          id: firebaseUser.uid,
          name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
          email: firebaseUser.email || '',
          picture: firebaseUser.photoURL || undefined,
          role: isAdminClaim ? 'admin' : 'user',
          admin: isAdminClaim,
        };
        
        setUser(userData);
        setIsAuthLoading(false); // Unblock once the real admin claim is known
        
        try {
          const userDocRef = doc(db, 'users', firebaseUser.uid);
          const userDocSnap = await Promise.race([
            getDoc(userDocRef),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Firestore timeout - Database might not be enabled')), 3000))
          ]) as any;
          
          if (userDocSnap.exists()) {
            const data = userDocSnap.data();
            if (data.wishlist) {
              setWishlist(data.wishlist);
            }
            setUser(prev => prev ? { ...prev, phone: data.phone, address: data.address, pincode: data.pincode } : prev);
          }
          
          // Upsert profile fields in Firestore. "role" is deliberately never
          // written from the client: it's a server-managed display mirror of
          // the real admin custom claim, and sending it here could clobber
          // that mirror back to "user" on every login.
          await setDoc(userDocRef, {
            id: userData.id,
            name: userData.name,
            email: userData.email,
            picture: userData.picture,
            lastLogin: serverTimestamp(),
          }, { merge: true });
        
        } catch (error: any) {
          // If the network is offline or blocked, suppress the error
          if (error?.message?.includes('offline')) {
            console.warn("Firestore offline, defaulting to local cache/role.");
          } else {
            console.warn("Could not sync user profile:", error.message);
          }
        }
      } else {
        setUser(null);
        setIsAuthLoading(false);
      }
    });
    return () => {
      isMounted = false;
      clearTimeout(fallbackTimeout);
      unsubscribe();
    };
  }, []);

  const addToCart = React.useCallback((product: CartProduct, quantity: number = 1) => {
    setItems(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item => 
          item.id === product.id ? { ...item, quantity: item.quantity + quantity } : item
        );
      }
      const numPrice = product.numericPrice ?? (typeof product.price === 'number' ? product.price : parseFloat(String(product.price).replace(/[^0-9.]/g, '')) || 0);
      return [...prev, { ...product, numericPrice: numPrice, quantity }];
    });

    // Trigger premium notification toast
    setAddedItemToast({ id: String(product.id), name: product.name });
  }, []);

  const removeFromCart = React.useCallback((id: string | number) => {
    setItems(prev => prev.filter(item => String(item.id) !== String(id)));
  }, []);

  const updateQuantity = React.useCallback((id: string | number, quantity: number) => {
    if (quantity <= 0) {
      setItems(prev => prev.filter(item => String(item.id) !== String(id)));
    } else {
      setItems(prev => prev.map(item => String(item.id) === String(id) ? { ...item, quantity } : item));
    }
  }, []);

  const clearCart = React.useCallback(() => setItems([]), []);

  // Re-validates cart items against live product data so the cart doesn't
  // silently show a stale price/stock snapshotted at add-to-cart time --
  // checkout was already authoritative server-side, but the cart *display*
  // previously never refreshed until submit. Called when the cart opens.
  const syncCartPrices = React.useCallback(async () => {
    if (items.length === 0) return;
    const results = await Promise.all(
      items.map(async (item) => {
        try {
          const snap = await getDoc(doc(db, 'products', String(item.id)));
          if (!snap.exists()) return null;
          return { id: item.id, data: snap.data() as any };
        } catch {
          return null;
        }
      })
    );
    const updates = new Map(results.filter(Boolean).map((r: any) => [String(r.id), r.data]));
    if (updates.size === 0) return;
    setItems(current => current.map(item => {
      const fresh = updates.get(String(item.id)) as any;
      if (!fresh) return item;
      const freshPrice = typeof fresh.numericPrice === 'number' ? fresh.numericPrice
        : (typeof fresh.price === 'number' ? fresh.price : parseFloat(String(fresh.price).replace(/[^0-9.]/g, '')) || item.numericPrice);
      const changed = freshPrice !== item.numericPrice || fresh.stock !== item.stock || fresh.stockStatus !== item.stockStatus;
      if (!changed) return item;
      return { ...item, numericPrice: freshPrice, price: fresh.price ?? item.price, stock: fresh.stock ?? item.stock, stockStatus: fresh.stockStatus ?? item.stockStatus };
    }));
  }, [items]);

  const logoutUser = React.useCallback(async () => {
    try {
      await signOut(auth);
      setItems([]);
      setWishlist([]);
      localStorage.removeItem('jiyoo_cart');
      localStorage.removeItem('jiyoo_wishlist');
    } catch (error) {
      console.error("Error signing out:", error);
    }
  }, []);

  const cartTotal = items.reduce((sum, item) => sum + (getValidPrice(item) * item.quantity), 0);
  const cartCount = items.reduce((sum, item) => sum + item.quantity, 0);


  const contextValue = React.useMemo(() => ({
    items,
    addToCart,
    removeFromCart,
    updateQuantity,
    cartTotal,
    cartCount,
    clearCart,
    syncCartPrices,
    user,
    logoutUser,
    isAuthLoading,
    searchQuery,
    setSearchQuery,
    wishlist,
    toggleWishlist,
    addedItemToast,
    setAddedItemToast,
    flyingItems,
    triggerFlyingItem,
    removeFlyingItem
  }), [items, cartTotal, cartCount, syncCartPrices, user, isAuthLoading, searchQuery, wishlist, addedItemToast, flyingItems]);

  return (
    <CartContext.Provider value={contextValue}>
      {children}
    </CartContext.Provider>
  );

}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}

