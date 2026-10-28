import { getAuth } from 'firebase/auth';
import { isFirebaseConfigured } from '../../../services/firebase';
import { createSingleProductWhatsAppUrl } from '../../../utils/whatsapp';
import { useToast } from '../../core/contexts/ToastContext';

export function useWhatsAppOrder() {
  const { showToast } = useToast();

  const handleWhatsAppOrder = async ({
    product,
    user,
    settings,
    quantity,
    currentPrice,
    currentUnit,
    selectedCut,
    orderType = 'retail',
    selectedArea,
    pincode,
  }: any) => {
    if (!product) return null;

    const safeQty = Math.max(1, Math.min(100, Number(quantity) || 1));
    let orderId: string | null = null;
    let verificationCode: string | undefined;
    let authoritativeTotal = (Number(currentPrice) || 0) * safeQty;

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (isFirebaseConfigured) {
        try {
          const currentUser = getAuth().currentUser;
          if (currentUser) {
            const token = await currentUser.getIdToken();
            if (token) headers['Authorization'] = `Bearer ${token}`;
          }
        } catch {
          // Guest or offline token lookup: proceed without blocking WhatsApp order
        }
      }

      const res = await fetch('/api/whatsapp/prepare-order', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          items: [
            {
              id: product.id,
              baseId: (product as any).baseId || product.id,
              name: product.name,
              quantity: safeQty,
              price: Number(currentPrice) || 0,
              image: product.image,
              selectedWeight: currentUnit || null,
              selectedCut: selectedCut || null,
            },
          ],
          shippingDetails: {
            name: user?.name || user?.displayName || '',
            phone: (user as any)?.phone || '',
            address: selectedArea || '',
            pincode: pincode || '',
          },
          orderType,
          isSingleProductQuickOrder: true,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Could not validate WhatsApp order');
      }

      orderId = data.orderId || null;
      verificationCode = data.verificationCode || undefined;
      if (typeof data.subtotal === 'number' && data.subtotal > 0) {
        authoritativeTotal = data.subtotal;
      }
    } catch (e: any) {
      // If a validation rule rejected the request (e.g. out-of-stock or unserviceable pincode), surface it clearly
      if (e?.message && (e.message.includes('stock') || e.message.includes('PIN code') || e.message.includes('unavailable'))) {
        showToast(e.message, 'error');
        return null;
      }
      // Fallback reference when server/database is unreachable so WhatsApp ordering still works securely using catalog pricing
      const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const rand = Array.from(crypto.getRandomValues(new Uint8Array(4)))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('')
        .toUpperCase();
      orderId = `JY-${dateStr}-${rand}`;
      verificationCode = `LOC-${rand.slice(0, 6)}`;
    }

    const url = createSingleProductWhatsAppUrl({
      orderId: orderId || undefined,
      verificationCode,
      orderType,
      customerName: user?.name || user?.displayName,
      customerPhone: (user as any)?.phone,
      selectedArea,
      customerPincode: pincode,
      whatsappNumber: settings?.whatsappNumber,
      productName: product.name,
      quantity: safeQty,
      selectedWeight: currentUnit,
      selectedCut: selectedCut || undefined,
      totalPrice: authoritativeTotal,
    });

    window.open(url, '_blank');

    return { url, orderId, verificationCode };
  };

  return { handleWhatsAppOrder };
}
