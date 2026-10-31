import { useState, useEffect, Suspense } from "react";
import { Navbar } from './layouts/Navbar';
import { Hero } from './features/storefront/components/Hero';
import { Storefront } from './features/storefront/components/Storefront';
import { SplashScreen } from './features/core/components/SplashScreen';
import { useCart, CartProvider } from "./contexts/CartContext";
import { SettingsProvider } from "./contexts/SettingsContext";
import { ErrorBoundary } from './features/core/components/ErrorBoundary';
import { OfflineBanner } from './features/core/components/OfflineBanner';
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
import { WholesaleCurtainTransition } from "./features/wholesale/components/WholesaleCurtainTransition";
import {
  consumeProgrammaticDismissal,
  isOverlayActive,
  isProgrammaticOverlayDismissal,
} from "./features/core/hooks/useModalBackButton";

function AppContent() {
  const { user, searchQuery, setSearchQuery } = useCart();
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
  const [isWholesaleCurtainActive, setIsWholesaleCurtainActive] = useState(false);
  const [wholesaleCurtainKey, setWholesaleCurtainKey] = useState(0);

  const openWholesalePage = () => {
    setWholesaleCurtainKey((prev) => prev + 1);
    setIsWholesaleCurtainActive(true);
    setActivePage('wholesale');
    window.history.pushState({ jiyooPage: 'wholesale' }, '', '#wholesale');
    window.scrollTo({ top: 0, behavior: 'auto' });
  };

  const openRetailPage = () => {
    setIsWholesaleCurtainActive(false);
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

  // Hierarchical 4-Tier Back Button Navigation Stack:
  // Tier 1: Closes any active modal or overlay (Auth, Cart, Account, Admin, About, Contact, Product Detail)
  // Tier 2: If on Wholesale page, navigates back to Retail catalog
  // Tier 3: If an active search query is entered, clears search and restores catalog
  // Tier 4: If category history exists, steps back to previous/root category
  // Tier 5: Only when fully at root catalog does the "Leave the app?" confirmation trigger
  useEffect(() => {
    const isIframe = typeof window !== 'undefined' && window.self !== window.top;
    if (!isIframe) {
      window.history.pushState({ jiyooGuard: true }, "", window.location.href);
    }

    const handlePopState = async (e: PopStateEvent) => {
      const poppedState = e.state as { jiyooCategory?: string; jiyooOverlay?: boolean; jiyooGuard?: boolean; jiyooPage?: string } | null;

      // Tier 1: Modals & Drawer Overlays
      if (isAuthOpen) {
        setIsAuthOpen(false);
        if (!isIframe) window.history.pushState({ jiyooGuard: true }, "", window.location.href);
        return;
      }
      if (isCartOpen) {
        setIsCartOpen(false);
        if (!isIframe) window.history.pushState({ jiyooGuard: true }, "", window.location.href);
        return;
      }
      if (isAccountOpen) {
        setIsAccountOpen(false);
        if (!isIframe) window.history.pushState({ jiyooGuard: true }, "", window.location.href);
        return;
      }
      if (isAdminOpen) {
        setIsAdminOpen(false);
        if (!isIframe) window.history.pushState({ jiyooGuard: true }, "", window.location.href);
        return;
      }
      if (isAboutOpen) {
        setIsAboutOpen(false);
        if (!isIframe) window.history.pushState({ jiyooGuard: true }, "", window.location.href);
        return;
      }
      if (isContactOpen) {
        setIsContactOpen(false);
        if (!isIframe) window.history.pushState({ jiyooGuard: true }, "", window.location.href);
        return;
      }

      if (
        isOverlayActive() ||
        isProgrammaticOverlayDismissal() ||
        consumeProgrammaticDismissal()
      ) {
        if (!isIframe) window.history.pushState({ jiyooGuard: true }, "", window.location.href);
        return;
      }

      // Tier 2: Page Navigation (Wholesale -> Retail)
      if (activePage === 'wholesale' || poppedState?.jiyooPage === 'retail') {
        openRetailPage();
        if (!isIframe) window.history.pushState({ jiyooGuard: true }, "", window.location.href);
        return;
      }

      // Tier 3: Search Query Filter (Clear search query first before exiting)
      if (searchQuery.trim() !== '') {
        setSearchQuery('');
        if (!isIframe) window.history.pushState({ jiyooGuard: true }, "", window.location.href);
        return;
      }

      // Tier 4: Category Navigation Stack
      if (window.sessionStorage.getItem('jiyoo_can_step_back_cat') === 'true') {
        window.dispatchEvent(new CustomEvent('step-back-category'));
        if (!isIframe) window.history.pushState({ jiyooGuard: true }, "", window.location.href);
        return;
      }

      if (isIframe) {
        return;
      }

      // Tier 5: Only prompt when truly at the base root state
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
  }, [confirm, isAuthOpen, isCartOpen, isAccountOpen, isAdminOpen, isAboutOpen, isContactOpen, activePage, searchQuery, setSearchQuery]);


  if (showSplash) {
    return (
      <div className="min-h-[100dvh] bg-[#f8f6f0]">
        <SplashScreen onComplete={() => setShowSplash(false)} />
      </div>
    );
  }

  const isAnyOverlayOpen =
    isCartOpen ||
    isAuthOpen ||
    isAccountOpen ||
    isAdminOpen ||
    isAboutOpen ||
    isContactOpen;

  return (
    <div className="bg-paper-texture min-h-[100dvh] flex flex-col text-brand-black font-sans selection:bg-brand-gray-900 selection:text-brand-white overflow-x-hidden">
      <WholesaleCurtainTransition
        active={isWholesaleCurtainActive}
        transitionKey={wholesaleCurtainKey}
        onComplete={() => setIsWholesaleCurtainActive(false)}
      />
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
        onAboutClick={() => setIsAboutOpen(true)}
        onContactClick={() => setIsContactOpen(true)}
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

      <div
        aria-hidden={isAnyOverlayOpen}
        className={`relative z-10 bg-paper-texture shadow-[0_20px_50px_rgba(0,0,0,0.5)] ${
          isAnyOverlayOpen ? "pointer-events-none select-none overflow-hidden" : ""
        }`}
      >
        <main className="flex-grow pt-[calc(7.25rem+env(safe-area-inset-top))] sm:pt-[calc(7.75rem+env(safe-area-inset-top))] lg:pt-[calc(5rem+env(safe-area-inset-top))] pb-0">
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

      <div
        aria-hidden={isAnyOverlayOpen}
        className={`relative z-0 w-full ${
          isAnyOverlayOpen ? "pointer-events-none select-none overflow-hidden" : ""
        }`}
      >
        <Suspense fallback={null}>
          <Footer />
        </Suspense>
      </div>

      <FlyingItemsLayer />
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
