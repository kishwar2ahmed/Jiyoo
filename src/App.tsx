import React, { useState, useEffect, Suspense, lazy } from 'react';
import { CartProvider } from './contexts/CartContext';
import { SettingsProvider } from './contexts/SettingsContext';
import { ToastProvider } from './features/core/contexts/ToastContext';
import { ConfirmProvider } from './features/core/contexts/ConfirmContext';
import { Navbar } from './layouts/Navbar';
import { Footer } from './layouts/Footer';
import { Hero } from './features/storefront/components/Hero';
import { Storefront } from './features/storefront/components/Storefront';
import { WholesalePage } from './features/wholesale/components/WholesalePage';
import { CartModal } from './features/cart/components/CartModal';
import { AuthModal } from './features/auth/components/AuthModal';
import { AboutModal } from './features/core/components/AboutModal';
import { ContactModal } from './features/core/components/ContactModal';
import { LegalPolicyModal } from './features/core/components/LegalPolicyModal';
import { CookieConsentBanner } from './features/core/components/CookieConsentBanner';
import { OfflineBanner } from './features/core/components/OfflineBanner';
import { FlyingItemsLayer } from './features/core/components/FlyingItemsLayer';

const AdminPanel = lazy(() =>
  import('./features/admin/components/AdminPanel').then((m) => ({ default: m.AdminPanel }))
);

function AppContent() {
  const [activePage, setActivePageState] = useState<'retail' | 'wholesale'>(() => {
    if (typeof window === 'undefined') return 'retail';
    if (window.location.hash === '#wholesale') return 'wholesale';
    const params = new URLSearchParams(window.location.search);
    if (params.get('section') === 'wholesale') return 'wholesale';
    if (params.get('section') === 'retail') return 'retail';
    try {
      const saved = sessionStorage.getItem('jiyoo_active_page');
      if (saved === 'wholesale' || saved === 'retail') return saved;
    } catch {
      // ignore storage errors
    }
    return 'retail';
  });
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [cartInitialStep, setCartInitialStep] = useState<'cart' | 'checkout'>('cart');
  const [cartInitialPayment, setCartInitialPayment] = useState<'upi_qr' | 'cod' | 'whatsapp' | undefined>(undefined);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [isContactOpen, setIsContactOpen] = useState(false);
  const [legalPolicyType, setLegalPolicyType] = useState<'privacy' | 'terms' | 'refund' | null>(
    null
  );
  const [isAdminRoute, setIsAdminRoute] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.location.hash === '#admin' || window.location.hash.startsWith('#admin/');
  });

  const setActivePage = (nextPage: 'retail' | 'wholesale') => {
    setActivePageState((prev) => {
      if (prev !== nextPage && typeof window !== 'undefined') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
      return nextPage;
    });
    try {
      sessionStorage.setItem('jiyoo_active_page', nextPage);
    } catch {
      // ignore storage errors
    }
  };

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      setIsAdminRoute(hash === '#admin' || hash.startsWith('#admin/'));
      if (hash === '#wholesale') {
        setActivePage('wholesale');
      }
    };

    const handleOpenRetail = () => setActivePage('retail');
    const handleOpenWholesale = () => setActivePage('wholesale');
    const handleOpenAbout = () => setIsAboutOpen(true);
    const handleOpenContact = () => setIsContactOpen(true);
    const handleOpenLegal = (e: Event) => {
      const detail = (e as CustomEvent)?.detail;
      const tab = typeof detail === 'string' ? detail : detail?.tab;
      if (tab === 'privacy' || tab === 'terms' || tab === 'refund') {
        setLegalPolicyType(tab);
      }
    };
    const handleOpenWhatsAppCheckout = () => {
      setCartInitialStep('checkout');
      setCartInitialPayment('whatsapp');
      setIsCartOpen(true);
    };

    window.addEventListener('hashchange', handleHashChange);
    document.addEventListener('open-retail', handleOpenRetail);
    document.addEventListener('open-wholesale', handleOpenWholesale);
    document.addEventListener('open-about', handleOpenAbout);
    document.addEventListener('open-contact', handleOpenContact);
    document.addEventListener('open-legal', handleOpenLegal);
    document.addEventListener('open-legal-policy', handleOpenLegal);
    window.addEventListener('open-legal-policy', handleOpenLegal);
    document.addEventListener('open-whatsapp-checkout', handleOpenWhatsAppCheckout);
    window.addEventListener('open-whatsapp-checkout', handleOpenWhatsAppCheckout);

    return () => {
      window.removeEventListener('hashchange', handleHashChange);
      document.removeEventListener('open-retail', handleOpenRetail);
      document.removeEventListener('open-wholesale', handleOpenWholesale);
      document.removeEventListener('open-about', handleOpenAbout);
      document.removeEventListener('open-contact', handleOpenContact);
      document.removeEventListener('open-legal', handleOpenLegal);
      document.removeEventListener('open-legal-policy', handleOpenLegal);
      window.removeEventListener('open-legal-policy', handleOpenLegal);
      document.removeEventListener('open-whatsapp-checkout', handleOpenWhatsAppCheckout);
      window.removeEventListener('open-whatsapp-checkout', handleOpenWhatsAppCheckout);
    };
  }, []);

  const closeAdminRoute = () => {
    if (typeof window !== 'undefined') {
      window.history.pushState('', document.title, window.location.pathname + window.location.search);
    }
    setIsAdminRoute(false);
  };

  return (
    <div className="min-h-screen flex flex-col bg-paper-texture text-brand-black">
      <OfflineBanner />
      <FlyingItemsLayer />

      {isAdminRoute && (
        <Suspense
          fallback={
            <div className="fixed inset-0 z-50 bg-[#FAF9F5] flex items-center justify-center text-sm font-medium text-brand-gray-600">
              Loading JIYOO Admin Control Panel...
            </div>
          }
        >
          <AdminPanel onClose={closeAdminRoute} />
        </Suspense>
      )}

      <Navbar
        onUserClick={() => setIsAuthOpen(true)}
        onCartClick={() => {
          setCartInitialStep('cart');
          setCartInitialPayment(undefined);
          setIsCartOpen(true);
        }}
        onAboutClick={() => setIsAboutOpen(true)}
        onContactClick={() => setIsContactOpen(true)}
        activePage={activePage}
        onWholesaleClick={() => setActivePage('wholesale')}
        onRetailClick={() => setActivePage('retail')}
      />

      <main className="flex-1" aria-hidden={isAdminRoute}>
        {activePage === 'wholesale' ? (
          <WholesalePage
            onBackToRetail={() => setActivePage('retail')}
            onOpenCart={() => {
              setCartInitialStep('cart');
              setCartInitialPayment(undefined);
              setIsCartOpen(true);
            }}
          />
        ) : (
          <>
            <Hero onOpenWholesale={() => setActivePage('wholesale')} />
            <Storefront />
          </>
        )}
      </main>

      <div aria-hidden={isAdminRoute}>
        <Footer />
      </div>

      <CartModal
        isOpen={isCartOpen}
        initialStep={cartInitialStep}
        initialPaymentMethod={cartInitialPayment}
        onClose={() => {
          setIsCartOpen(false);
          setCartInitialStep('cart');
          setCartInitialPayment(undefined);
        }}
        onRequireAuth={() => {
          setIsCartOpen(false);
          setIsAuthOpen(true);
        }}
      />

      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
      <AboutModal isOpen={isAboutOpen} onClose={() => setIsAboutOpen(false)} />
      <ContactModal isOpen={isContactOpen} onClose={() => setIsContactOpen(false)} />
      <LegalPolicyModal
        isOpen={Boolean(legalPolicyType)}
        initialTab={legalPolicyType || 'privacy'}
        onClose={() => setLegalPolicyType(null)}
      />
      <CookieConsentBanner />
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <ConfirmProvider>
        <SettingsProvider>
          <CartProvider>
            <AppContent />
          </CartProvider>
        </SettingsProvider>
      </ConfirmProvider>
    </ToastProvider>
  );
}
