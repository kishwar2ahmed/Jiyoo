import { useState, useEffect, Suspense } from "react";
import { Navbar } from './layouts/Navbar';
import { Hero } from './features/storefront/components/Hero';
import { Storefront } from './features/storefront/components/Storefront';
import { SplashScreen } from './features/core/components/SplashScreen';
import { useCart, CartProvider } from "./contexts/CartContext";
import { SettingsProvider } from "./contexts/SettingsContext";
import { ErrorBoundary } from './features/core/components/ErrorBoundary';
import { OfflineBanner } from './features/core/components/OfflineBanner';
import { AnimatePresence } from "motion/react";

import { ToastNotification } from './features/cart/components/ToastNotification';
import { ToastProvider } from './features/core/contexts/ToastContext';
import { ConfirmProvider, useConfirm } from './features/core/contexts/ConfirmContext';
import { useFCM } from './services/useFCM';
import { isFirebaseConfigured } from './services/firebase';




import { Footer } from "./layouts/Footer";
import { FlyingItemsLayer } from "./features/core/components/FlyingItemsLayer";
import { AuthModal } from "./features/auth/components/AuthModal";
import { AccountCenter } from "./features/auth/components/AccountCenter";
import { CartModal } from "./features/cart/components/CartModal";
import { AboutModal } from "./features/core/components/AboutModal";
import { ContactModal } from "./features/core/components/ContactModal";
import { AdminPanel } from "./features/admin/components/AdminPanel";

function AppContent() {
  const { user, isAuthLoading, addedItemToast, setAddedItemToast } = useCart();
  const confirm = useConfirm();
  useFCM();
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [isContactOpen, setIsContactOpen] = useState(false);
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    try {
      // Clear old product caches
      Object.keys(localStorage).forEach((key) => {
        if (key.startsWith('jiyoo_cached_products') && key !== 'jiyoo_cached_products_v21') {
          localStorage.removeItem(key);
        }
      });
      localStorage.removeItem('jiyoo_settings_v6');
    } catch (e) {
      console.error('Failed to clear cache:', e);
    }
    const handleOpenAbout = () => setIsAboutOpen(true);
    const handleOpenContact = () => setIsContactOpen(true);
    document.addEventListener('open-about', handleOpenAbout);
    document.addEventListener('open-contact', handleOpenContact);
    return () => {
      document.removeEventListener('open-about', handleOpenAbout);
      document.removeEventListener('open-contact', handleOpenContact);
    };
  }, []);

  useEffect(() => {
    // Check if URL has #admin - only allow if user is actually an admin
    const checkHash = () => {
      if (window.location.hash === '#admin' && user?.admin === true) {
        setIsAdminOpen(true);
      } else if (window.location.hash === '#admin' && user?.admin !== true) {
        // Remove #admin from URL if user is not an admin (prevent privilege escalation)
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    };
    checkHash();
    window.addEventListener('hashchange', checkHash);
    return () => window.removeEventListener('hashchange', checkHash);
  }, [user?.admin]);

  useEffect(() => {
    if (addedItemToast) {
      const timer = setTimeout(() => {
        setAddedItemToast(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [addedItemToast, setAddedItemToast]);

  // Confirm before actually leaving the app. Storefront.tsx pushes a history
  // entry for each category visited (so back steps through categories one at
  // a time) and useModalBackButton does the same for open overlays. This
  // pushes one more guard entry so that once the back button pops past all
  // of those, the resulting popstate lands here -- where we can ask first,
  // instead of the browser leaving the page immediately with no entry left
  // for us to intercept.
  useEffect(() => {
    window.history.pushState({ jiyooGuard: true }, "", window.location.href);

    const handlePopState = async (e: PopStateEvent) => {
      const poppedState = e.state as { jiyooCategory?: string; jiyooOverlay?: boolean; jiyooGuard?: boolean } | null;
      if (poppedState?.jiyooCategory || poppedState?.jiyooOverlay) return; // another listener handles this step

      const shouldLeave = await confirm({
        title: "Leave the app?",
        message: "Are you sure you want to exit?",
      });
      if (shouldLeave) {
        // Let the back navigation actually proceed past our guard entry.
        window.history.back();
      } else {
        // Re-arm the guard so the next back press is caught again.
        window.history.pushState({ jiyooGuard: true }, "", window.location.href);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [confirm]);


  const [hasPromptedLogin, setHasPromptedLogin] = useState(false);

  useEffect(() => {
    // Do not interrupt the storefront with an authentication modal merely because
    // a deployment is missing its Firebase client configuration. Checkout remains
    // auth-gated, and the auth modal can still be opened explicitly when configured.
    if (isFirebaseConfigured && !showSplash && !isAuthLoading && !user && !hasPromptedLogin) {
      setIsAuthOpen(true);
      setHasPromptedLogin(true);
    }
  }, [showSplash, isAuthLoading, user, hasPromptedLogin]);

  if (showSplash) {
    return (
      <div className="min-h-[100dvh] bg-[#f8f6f0]">
        <SplashScreen onComplete={() => setShowSplash(false)} />
      </div>
    );
  }

  return (
    <div className="bg-paper-texture min-h-[100dvh] flex flex-col text-brand-black font-sans selection:bg-brand-gray-900 selection:text-brand-white overflow-x-hidden">
      <OfflineBanner />
      <Suspense fallback={<div />}>
        {isAdminOpen && <AdminPanel onClose={() => {
          setIsAdminOpen(false);
          window.history.pushState("", document.title, window.location.pathname + window.location.search);
        }} />}
      </Suspense>
      
      <Navbar
        onAboutClick={() => setIsAboutOpen(true)}
        onUserClick={() => user ? setIsAccountOpen(true) : setIsAuthOpen(true)}
        onCartClick={() => setIsCartOpen(true)}
      />
      
      
      <Suspense fallback={null}>
        {isAccountOpen && <AccountCenter onClose={() => setIsAccountOpen(false)} />}
      </Suspense>

      <Suspense fallback={null}>
        <AuthModal 
          isOpen={isAuthOpen} 
          onClose={() => setIsAuthOpen(false)} 
        />
        
        <CartModal isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} onRequestAuth={() => { setIsCartOpen(false); setIsAuthOpen(true); }} />
        <AboutModal isOpen={isAboutOpen} onClose={() => setIsAboutOpen(false)} />
        <ContactModal isOpen={isContactOpen} onClose={() => setIsContactOpen(false)} />
      </Suspense>

      <div className="relative z-10 bg-paper-texture shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
        <main className="flex-grow pt-[calc(4rem+env(safe-area-inset-top))] sm:pt-[calc(5rem+env(safe-area-inset-top))] pb-0">
          <Hero />
          <Storefront />
        </main>
      </div>

      <div className="relative z-0 w-full">
        <Suspense fallback={null}>
          <Footer />
        </Suspense>
      </div>

      <FlyingItemsLayer />

      <AnimatePresence>
        <ToastNotification item={addedItemToast} onClose={() => setAddedItemToast(null)} />
      </AnimatePresence>
    </div>
  );
}

export default function App() {
  return (
    <SettingsProvider>
      <CartProvider>
        <ErrorBoundary>
          <ToastProvider>
            <ConfirmProvider>
              <AppContent />
            </ConfirmProvider>
          </ToastProvider>
        </ErrorBoundary>
      </CartProvider>
    </SettingsProvider>
  );
}
