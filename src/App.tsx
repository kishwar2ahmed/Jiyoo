import { useState, useEffect, Suspense } from "react";
import { Navbar } from './layouts/Navbar';
import { Hero } from './features/storefront/components/Hero';
import { Storefront } from './features/storefront/components/Storefront';
import { SplashScreen } from './features/core/components/SplashScreen';
import { useCart, CartProvider } from "./contexts/CartContext";
import { SettingsProvider } from "./contexts/SettingsContext";
import { ErrorBoundary } from './features/core/components/ErrorBoundary';
import { OfflineBanner } from './features/core/components/OfflineBanner';
import { ScrollProgress } from './features/core/components/ScrollProgress';
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
import { WholesalePage } from "./features/wholesale/components/WholesalePage";
import {
  consumeProgrammaticDismissal,
  isOverlayActive,
  isProgrammaticOverlayDismissal,
} from "./features/core/hooks/useModalBackButton";

function AppContent() {
  const { user, addedItemToast, setAddedItemToast } = useCart();
  const confirm = useConfirm();
  useFCM();
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [isContactOpen, setIsContactOpen] = useState(false);
  const [activePage, setActivePage] = useState<'retail' | 'wholesale'>(() =>
    window.location.hash === '#wholesale' ? 'wholesale' : 'retail'
  );
  const [showSplash, setShowSplash] = useState(true);

  const openWholesalePage = () => {
    setActivePage('wholesale');
    window.history.pushState({ jiyooPage: 'wholesale' }, '', '#wholesale');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openRetailPage = () => {
    setActivePage('retail');
    if (window.location.hash === '#wholesale') {
      window.history.pushState({ jiyooPage: 'retail' }, '', window.location.pathname + window.location.search);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    try {
      // Remove only obsolete legacy keys; never delete the active public product catalog cache
      localStorage.removeItem('jiyoo_settings_v6');
    } catch (e) {
      console.error('Failed to clean legacy cache key:', e);
    }
    const handleOpenAbout = () => setIsAboutOpen(true);
    const handleOpenContact = () => setIsContactOpen(true);
    const handleOpenWholesale = () => openWholesalePage();
    const handleOpenRetail = () => openRetailPage();
    const handleOpenWhatsAppCheckout = () => setIsCartOpen(true);
    document.addEventListener('open-about', handleOpenAbout);
    document.addEventListener('open-contact', handleOpenContact);
    document.addEventListener('open-wholesale', handleOpenWholesale);
    document.addEventListener('open-retail', handleOpenRetail);
    document.addEventListener('open-whatsapp-checkout', handleOpenWhatsAppCheckout);
    return () => {
      document.removeEventListener('open-about', handleOpenAbout);
      document.removeEventListener('open-contact', handleOpenContact);
      document.removeEventListener('open-wholesale', handleOpenWholesale);
      document.removeEventListener('open-retail', handleOpenRetail);
      document.removeEventListener('open-whatsapp-checkout', handleOpenWhatsAppCheckout);
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
      } else if (window.location.hash === '#wholesale') {
        setActivePage('wholesale');
      } else if (window.location.hash === '') {
        setActivePage('retail');
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

  // Confirm before actually leaving the app in standalone browser sessions.
  // Never prompt when closing an internal modal/overlay (such as AuthModal after
  // sign-in) or when running inside an embedded preview iframe.
  useEffect(() => {
    const isIframe = typeof window !== 'undefined' && window.self !== window.top;
    if (!isIframe) {
      window.history.pushState({ jiyooGuard: true }, "", window.location.href);
    }

    const handlePopState = async (e: PopStateEvent) => {
      const poppedState = e.state as { jiyooCategory?: string; jiyooOverlay?: boolean; jiyooGuard?: boolean; jiyooPage?: string } | null;
      if (poppedState?.jiyooPage === 'retail') {
        setActivePage('retail');
        return;
      }
      if (poppedState?.jiyooPage === 'wholesale') {
        setActivePage('wholesale');
        return;
      }
      if (
        isIframe ||
        poppedState?.jiyooCategory ||
        poppedState?.jiyooOverlay ||
        isOverlayActive() ||
        isProgrammaticOverlayDismissal() ||
        consumeProgrammaticDismissal()
      ) {
        return;
      }

      if (isAuthOpen || isCartOpen || isAccountOpen || isAdminOpen || isAboutOpen || isContactOpen) {
        return;
      }

      const shouldLeave = await confirm({
        title: "Leave the app?",
        message: "Are you sure you want to exit?",
      });
      if (shouldLeave) {
        window.history.back();
      } else {
        window.history.pushState({ jiyooGuard: true }, "", window.location.href);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [confirm, isAuthOpen, isCartOpen, isAccountOpen, isAdminOpen, isAboutOpen, isContactOpen]);


  if (showSplash) {
    return (
      <div className="min-h-[100dvh] bg-[#f8f6f0]">
        <SplashScreen onComplete={() => setShowSplash(false)} />
      </div>
    );
  }

  return (
    <div className="bg-paper-texture min-h-[100dvh] flex flex-col text-brand-black font-sans selection:bg-brand-gray-900 selection:text-brand-white overflow-x-hidden">
      <ScrollProgress />
      <OfflineBanner />
      <Suspense fallback={<div />}>
        {isAdminOpen && <AdminPanel onClose={() => {
          setIsAdminOpen(false);
          window.history.pushState("", document.title, window.location.pathname + window.location.search);
        }} />}
      </Suspense>
      
      <Navbar
        activePage={activePage}
        onWholesaleClick={openWholesalePage}
        onRetailClick={openRetailPage}
        onAboutClick={() => {
          document.getElementById('about-us-section')?.scrollIntoView({ behavior: 'smooth' });
          setIsAboutOpen(true);
        }}
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
          {activePage === 'wholesale' ? (
            <WholesalePage onBackToRetail={openRetailPage} />
          ) : (
            <>
              <Hero onOpenWholesale={openWholesalePage} />
              <Storefront />
            </>
          )}
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
