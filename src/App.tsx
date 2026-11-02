import { useState, useEffect, Suspense, lazy } from "react";
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

import { Footer } from "./layouts/Footer";
import { FlyingItemsLayer } from "./features/core/components/FlyingItemsLayer";
import type { LegalPolicyTab } from "./features/core/components/LegalPolicyModal";
import { WholesaleCurtainTransition } from "./features/wholesale/components/WholesaleCurtainTransition";

const AuthModal = lazy(() =>
  import("./features/auth/components/AuthModal").then((m) => ({ default: m.AuthModal }))
);
const AccountCenter = lazy(() =>
  import("./features/auth/components/AccountCenter").then((m) => ({ default: m.AccountCenter }))
);
const CartModal = lazy(() =>
  import("./features/cart/components/CartModal").then((m) => ({ default: m.CartModal }))
);
const AboutModal = lazy(() =>
  import("./features/core/components/AboutModal").then((m) => ({ default: m.AboutModal }))
);
const ContactModal = lazy(() =>
  import("./features/core/components/ContactModal").then((m) => ({ default: m.ContactModal }))
);
const LegalPolicyModal = lazy(() =>
  import("./features/core/components/LegalPolicyModal").then((m) => ({ default: m.LegalPolicyModal }))
);
const AdminPanel = lazy(() =>
  import("./features/admin/components/AdminPanel").then((m) => ({ default: m.AdminPanel }))
);
const WholesalePage = lazy(() =>
  import("./features/wholesale/components/WholesalePage").then((m) => ({ default: m.WholesalePage }))
);
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
  const [isLegalOpen, setIsLegalOpen] = useState(false);
  const [legalTab, setLegalTab] = useState<LegalPolicyTab>("privacy");
  const [activePage, setActivePage] = useState<'retail' | 'wholesale'>(() =>
    window.location.hash === '#wholesale' ? 'wholesale' : 'retail'
  );
  const [showSplash, setShowSplash] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem('jiyoo_splash_shown') !== '1';
    } catch {
      return true;
    }
  });
  const [isWholesaleCurtainActive, setIsWholesaleCurtainActive] = useState(false);
  const [wholesaleCurtainKey, setWholesaleCurtainKey] = useState(0);

  // Preload CartModal & WholesalePage chunks during browser idle time after initial paint
  useEffect(() => {
    const timer = window.setTimeout(() => {
      import("./features/cart/components/CartModal").catch(() => {});
      import("./features/wholesale/components/WholesalePage").catch(() => {});
    }, 1200);
    return () => window.clearTimeout(timer);
  }, []);

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
    const handleOpenAdmin = () => {
      setIsAdminOpen(true);
      window.history.pushState({ jiyooAdmin: true }, "", "#admin");
    };
    const handleOpenLegalPolicy = (e: Event) => {
      const customEvent = e as CustomEvent<{ tab?: LegalPolicyTab }>;
      setLegalTab(customEvent.detail?.tab || "privacy");
      setIsLegalOpen(true);
    };
    document.addEventListener('open-about', handleOpenAbout);
    document.addEventListener('open-contact', handleOpenContact);
    document.addEventListener('open-wholesale', handleOpenWholesale);
    document.addEventListener('open-retail', handleOpenRetail);
    document.addEventListener('open-whatsapp-checkout', handleOpenWhatsAppCheckout);
    document.addEventListener('open-admin', handleOpenAdmin);
    document.addEventListener('open-legal-policy', handleOpenLegalPolicy);
    return () => {
      document.removeEventListener('open-about', handleOpenAbout);
      document.removeEventListener('open-contact', handleOpenContact);
      document.removeEventListener('open-wholesale', handleOpenWholesale);
      document.removeEventListener('open-retail', handleOpenRetail);
      document.removeEventListener('open-whatsapp-checkout', handleOpenWhatsAppCheckout);
      document.removeEventListener('open-admin', handleOpenAdmin);
      document.removeEventListener('open-legal-policy', handleOpenLegalPolicy);
    };
  }, []);

  useEffect(() => {
    const checkUrlAndHash = () => {
      const params = new URLSearchParams(window.location.search);
      const viewParam = params.get('view');
      const policyParam = params.get('policy');
      const modalParam = params.get('modal');
      const hash = window.location.hash;

      if (hash === '#admin') {
        setIsAdminOpen(true);
      } else if (hash === '#wholesale' || viewParam === 'wholesale') {
        setActivePage('wholesale');
      } else if (hash === '#privacy-policy' || policyParam === 'privacy') {
        setLegalTab('privacy');
        setIsLegalOpen(true);
      } else if (hash === '#terms' || policyParam === 'terms') {
        setLegalTab('terms');
        setIsLegalOpen(true);
      } else if (
        hash === '#refund-policy' ||
        hash === '#shipping-policy' ||
        policyParam === 'refund' ||
        policyParam === 'shipping'
      ) {
        setLegalTab('refund');
        setIsLegalOpen(true);
      } else if (hash === '#contact' || modalParam === 'contact') {
        setIsContactOpen(true);
      } else if (hash === '#about' || modalParam === 'about') {
        setIsAboutOpen(true);
      } else if (hash === '' && viewParam !== 'wholesale') {
        setActivePage('retail');
      }
    };
    checkUrlAndHash();
    window.addEventListener('hashchange', checkUrlAndHash);
    return () => window.removeEventListener('hashchange', checkUrlAndHash);
  }, []);

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
      if (isLegalOpen) {
        setIsLegalOpen(false);
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
  }, [confirm, isAuthOpen, isCartOpen, isAccountOpen, isAdminOpen, isAboutOpen, isContactOpen, isLegalOpen, activePage, searchQuery, setSearchQuery]);


  const isAnyOverlayOpen =
    isCartOpen ||
    isAuthOpen ||
    isAccountOpen ||
    isAdminOpen ||
    isAboutOpen ||
    isContactOpen ||
    isLegalOpen;

  return (
    <div className="bg-paper-texture min-h-[100dvh] flex flex-col text-brand-black font-sans selection:bg-brand-gray-900 selection:text-brand-white overflow-x-hidden">
      {showSplash && (
        <SplashScreen
          onComplete={() => {
            try {
              sessionStorage.setItem('jiyoo_splash_shown', '1');
            } catch {
              // ignore storage errors
            }
            setShowSplash(false);
          }}
        />
      )}
      <WholesaleCurtainTransition
        active={isWholesaleCurtainActive}
        transitionKey={wholesaleCurtainKey}
        onComplete={() => setIsWholesaleCurtainActive(false)}
      />
      <OfflineBanner />
      <Suspense fallback={null}>
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
        {isAuthOpen && (
          <AuthModal 
            isOpen={isAuthOpen} 
            onClose={() => setIsAuthOpen(false)} 
          />
        )}
        {isCartOpen && (
          <CartModal
            isOpen={isCartOpen}
            onClose={() => setIsCartOpen(false)}
            onRequestAuth={() => {
              setIsCartOpen(false);
              setIsAuthOpen(true);
            }}
          />
        )}
        {isAboutOpen && <AboutModal isOpen={isAboutOpen} onClose={() => setIsAboutOpen(false)} />}
        {isContactOpen && <ContactModal isOpen={isContactOpen} onClose={() => setIsContactOpen(false)} />}
        {isLegalOpen && <LegalPolicyModal isOpen={isLegalOpen} initialTab={legalTab} onClose={() => setIsLegalOpen(false)} />}
      </Suspense>

      <div
        aria-hidden={isAnyOverlayOpen}
        className={`relative z-10 bg-paper-texture shadow-[0_20px_50px_rgba(0,0,0,0.5)] ${
          isAnyOverlayOpen ? "pointer-events-none select-none overflow-hidden" : ""
        }`}
      >
        <main
          className={`flex-grow pb-0 ${
            activePage === 'wholesale'
              ? 'pt-[calc(3.5rem+env(safe-area-inset-top))] sm:pt-[calc(4rem+env(safe-area-inset-top))] lg:pt-[calc(5rem+env(safe-area-inset-top))]'
              : 'pt-[calc(7.25rem+env(safe-area-inset-top))] sm:pt-[calc(7.75rem+env(safe-area-inset-top))] lg:pt-[calc(5rem+env(safe-area-inset-top))]'
          }`}
        >
          {activePage === 'wholesale' ? (
            <Suspense fallback={<div className="min-h-screen bg-white" />}>
              <WholesalePage
                onBackToRetail={openRetailPage}
                onOpenCart={() => setIsCartOpen(true)}
              />
            </Suspense>
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
