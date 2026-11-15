import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { AuthUser, CartItem, CartProduct } from '../types';
import { auth, db } from '../services/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { OWNER_ADMIN_EMAILS } from '../utils/adminAuth';
import {
  getSupabaseClient,
  isSupabaseConfigured,
  supabaseSignOut,
  supabaseUpsertRecord,
} from '../services/supabase';
import {
  getStoredCustomerSession,
  clearStoredCustomerSession,
} from '../utils/customerAuthFallback';

export interface FlyingItemPayload {
  image: string;
  name: string;
  price?: string | number;
  badge?: string;
  startX: number;
  startY: number;
}

export interface CartActionsValue {
  addToCart: (product: Partial<CartProduct> & { id: string | number; name: string }, quantity?: number) => void;
  removeFromCart: (id: string | number) => void;
  updateQuantity: (id: string | number, quantity: number) => void;
  clearCart: () => void;
  triggerFlyingItem: (payload: FlyingItemPayload) => void;
  toggleWishlist: (productId: string) => void;
  logoutUser: () => Promise<void>;
  setSearchQuery: React.Dispatch<React.SetStateAction<string>>;
}

export interface CartContextValue extends CartActionsValue {
  items: CartItem[];
  cartCount: number;
  cartTotal: number;
  wishlist: string[];
  user: AuthUser | null;
  isAuthLoading: boolean;
  searchQuery: string;
}

const CartContext = createContext<CartContextValue | null>(null);

const CART_STORAGE_KEY = 'jiyoo_cart_items_v1';
const WISHLIST_STORAGE_KEY = 'jiyoo_wishlist_v1';

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem(CART_STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });

  const [wishlist, setWishlist] = useState<string[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem(WISHLIST_STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed.map(String) : [];
    } catch {
      return [];
    }
  });

  const [user, setUser] = useState<AuthUser | null>(() => getStoredCustomerSession()?.user ?? null);
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(() => !getStoredCustomerSession()?.user);
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
    } catch {
      // ignore storage errors
    }
  }, [items]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(wishlist));
    } catch {
      // ignore storage errors
    }
  }, [wishlist]);

  useEffect(() => {
    let isMounted = true;

    const unsubscribeFirebase = onAuthStateChanged(auth, async (fbUser) => {
      if (!isMounted) return;
      if (fbUser) {
        const emailLower = (fbUser.email || '').trim().toLowerCase();
        let hasAdminClaim = false;
        try {
          const tokenRes = await fbUser.getIdTokenResult();
          hasAdminClaim = Boolean(tokenRes.claims?.admin === true);
        } catch {
          // ignore
        }
        const isOwner = Boolean(fbUser.emailVerified && OWNER_ADMIN_EMAILS.has(emailLower));
        const isAdmin = hasAdminClaim || isOwner;

        const authUser: AuthUser = {
          id: fbUser.uid,
          email: fbUser.email || '',
          name: fbUser.displayName || fbUser.email?.split('@')[0] || 'Customer',
          displayName: fbUser.displayName || undefined,
          picture: fbUser.photoURL || undefined,
          role: isAdmin ? 'admin' : 'customer',
          admin: isAdmin,
        };

        try {
          const userDocRef = doc(db, 'users', fbUser.uid);
          const snap = await getDoc(userDocRef);
          if (snap.exists()) {
            const data = snap.data();
            if (data?.phone) authUser.phone = data.phone;
            if (data?.address) authUser.address = data.address;
            if (data?.pincode) authUser.pincode = data.pincode;
          } else {
            await setDoc(
              userDocRef,
              {
                id: fbUser.uid,
                email: authUser.email,
                name: authUser.name,
                role: authUser.role,
                createdAt: new Date().toISOString(),
              },
              { merge: true }
            ).catch(() => {});
          }
        } catch {
          // ignore Firestore profile read error
        }

        if (isSupabaseConfigured) {
          supabaseUpsertRecord('users', {
            id: authUser.id,
            email: authUser.email,
            name: authUser.name || null,
            role: authUser.role || 'customer',
            data: authUser,
            updated_at: new Date().toISOString(),
          }).catch(() => {});
        }

        if (isMounted) {
          setUser(authUser);
          setIsAuthLoading(false);
        }
      } else {
        const storedCustomer = getStoredCustomerSession();
        if (isMounted) {
          setUser(storedCustomer ? storedCustomer.user : null);
          setIsAuthLoading(false);
        }
      }
    });

    const handleCustomerAuthEvent = (e: Event) => {
      if (!isMounted) return;
      const customEv = e as CustomEvent<AuthUser | null>;
      if (customEv.detail) {
        setUser(customEv.detail);
        setIsAuthLoading(false);
      } else if (!auth.currentUser) {
        setUser(null);
      }
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('jiyoo-customer-auth-changed', handleCustomerAuthEvent);
    }

    const supaClient = getSupabaseClient();
    const supaSub = supaClient?.auth.onAuthStateChange((_event, session) => {
      if (!isMounted) return;
      if (session?.user && !auth.currentUser) {
        const sUser = session.user;
        const emailLower = (sUser.email || '').trim().toLowerCase();
        const isAdmin = Boolean(sUser.email_confirmed_at && OWNER_ADMIN_EMAILS.has(emailLower));
        setUser({
          id: sUser.id,
          email: sUser.email || '',
          name:
            sUser.user_metadata?.full_name ||
            sUser.user_metadata?.name ||
            sUser.email?.split('@')[0] ||
            'Customer',
          role: isAdmin ? 'admin' : 'customer',
          admin: isAdmin,
        });
        setIsAuthLoading(false);
      }
    });

    return () => {
      isMounted = false;
      unsubscribeFirebase();
      if (typeof window !== 'undefined') {
        window.removeEventListener('jiyoo-customer-auth-changed', handleCustomerAuthEvent);
      }
      supaSub?.data?.subscription?.unsubscribe();
    };
  }, []);

  const addToCart = useCallback(
    (product: Partial<CartProduct> & { id: string | number; name: string }, quantity = 1) => {
      const qtyToAdd = Math.max(1, Number(quantity) || 1);
      const rawNumericPrice =
        typeof product.numericPrice === 'number' && !isNaN(product.numericPrice)
          ? product.numericPrice
          : parseFloat(String(product.price || '0').replace(/[^0-9.]/g, '')) || 0;

      setItems((prev) => {
        const targetId = String(product.id);
        const existingIndex = prev.findIndex((i) => String(i.id) === targetId);
        if (existingIndex > -1) {
          const updated = [...prev];
          updated[existingIndex] = {
            ...updated[existingIndex],
            quantity: updated[existingIndex].quantity + qtyToAdd,
          };
          return updated;
        }
        return [
          ...prev,
          {
            id: product.id,
            baseId: (product as any).baseId ?? product.id,
            name: product.name,
            price: product.price ?? `₹${rawNumericPrice}`,
            numericPrice: rawNumericPrice,
            unit: product.unit || product.selectedWeight || product.badge,
            badge: product.badge,
            image: product.image || '/jiyoo.logo.jpeg',
            quantity: qtyToAdd,
            selectedWeight: product.selectedWeight,
            selectedCut: product.selectedCut,
            selectedCleaning: (product as any).selectedCleaning,
            wholesaleEligible: (product as any).wholesaleEligible,
            wholesaleMinQty: (product as any).wholesaleMinQty,
          },
        ];
      });
    },
    []
  );

  const removeFromCart = useCallback((id: string | number) => {
    const targetId = String(id);
    setItems((prev) => prev.filter((item) => String(item.id) !== targetId));
  }, []);

  const updateQuantity = useCallback((id: string | number, quantity: number) => {
    const targetId = String(id);
    if (quantity <= 0) {
      setItems((prev) => prev.filter((item) => String(item.id) !== targetId));
      return;
    }
    setItems((prev) =>
      prev.map((item) => (String(item.id) === targetId ? { ...item, quantity } : item))
    );
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
  }, []);

  const triggerFlyingItem = useCallback((_payload: FlyingItemPayload) => {
    // Visual hook for cart badge pulse
  }, []);

  const toggleWishlist = useCallback((productId: string) => {
    const idStr = String(productId);
    setWishlist((prev) =>
      prev.includes(idStr) ? prev.filter((item) => item !== idStr) : [...prev, idStr]
    );
  }, []);

  const logoutUser = useCallback(async () => {
    try {
      await signOut(auth);
    } catch {
      // ignore
    }
    try {
      await supabaseSignOut();
    } catch {
      // ignore
    }
    clearStoredCustomerSession();
    setUser(null);
  }, []);

  const cartCount = useMemo(
    () => items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0),
    [items]
  );

  const cartTotal = useMemo(
    () =>
      items.reduce(
        (sum, item) => sum + (Number(item.numericPrice) || 0) * (Number(item.quantity) || 0),
        0
      ),
    [items]
  );

  const value = useMemo<CartContextValue>(
    () => ({
      items,
      cartCount,
      cartTotal,
      wishlist,
      user,
      isAuthLoading,
      searchQuery,
      setSearchQuery,
      addToCart,
      removeFromCart,
      updateQuantity,
      clearCart,
      triggerFlyingItem,
      toggleWishlist,
      logoutUser,
    }),
    [
      items,
      cartCount,
      cartTotal,
      wishlist,
      user,
      isAuthLoading,
      searchQuery,
      addToCart,
      removeFromCart,
      updateQuantity,
      clearCart,
      triggerFlyingItem,
      toggleWishlist,
      logoutUser,
    ]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return ctx;
}

export function useCartActions(): CartActionsValue {
  const ctx = useCart();
  return {
    addToCart: ctx.addToCart,
    removeFromCart: ctx.removeFromCart,
    updateQuantity: ctx.updateQuantity,
    clearCart: ctx.clearCart,
    triggerFlyingItem: ctx.triggerFlyingItem,
    toggleWishlist: ctx.toggleWishlist,
    logoutUser: ctx.logoutUser,
    setSearchQuery: ctx.setSearchQuery,
  };
}

export function useCartItemQuantity(itemId: string | number): number {
  const { items } = useCart();
  const target = String(itemId);
  const found = items.find((i) => String(i.id) === target);
  return found ? found.quantity : 0;
}
