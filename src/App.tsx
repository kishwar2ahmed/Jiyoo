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
import { OfflineBanner } from './features/core/components/OfflineBanner';
import { FlyingItemsLayer } from './features/core/components/FlyingItemsLayer';

const AdminPanel = lazy(() =>
  import('./features/admin/components/AdminPanel').then((m) => ({ default: m.AdminPanel }))
);

function AppContent() {
  const [activePage, setActivePage] = useState<'retail' | 'wholesale'>('retail');
  const [isCartOpen, setIsCartOpen] = useState(false);
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

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      setIsAdminRoute(hash === '#admin' || hash.startsWith('#admin/'));
    };

    const handleOpenRetail = () => setActivePage('retail');
    const handleOpenWholesale = () => setActivePage('wholesale');
    const handleOpenAbout = () => setIsAboutOpen(true);
    const handleOpenContact = () => setIsContactOpen(true);
    const handleOpenLegal = (e: Event) => {
      const detail = (e as CustomEvent)?.detail;
      if (detail === 'privacy' || detail === 'terms' || detail === 'refund') {
        setLegalPolicyType(detail);
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    document.addEventListener('open-retail', handleOpenRetail);
    document.addEventListener('open-wholesale', handleOpenWholesale);
    document.addEventListener('open-about', handleOpenAbout);
    document.addEventListener('open-contact', handleOpenContact);
    document.addEventListener('open-legal', handleOpenLegal);

    return () => {
      window.removeEventListener('hashchange', handleHashChange);
      document.removeEventListener('open-retail', handleOpenRetail);
      document.removeEventListener('open-wholesale', handleOpenWholesale);
      document.removeEventListener('open-about', handleOpenAbout);
      document.removeEventListener('open-contact', handleOpenContact);
      document.removeEventListener('open-legal', handleOpenLegal);
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
        onCartClick={() => setIsCartOpen(true)}
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
            onOpenCart={() => setIsCartOpen(true)}
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
        onClose={() => setIsCartOpen(false)}
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
