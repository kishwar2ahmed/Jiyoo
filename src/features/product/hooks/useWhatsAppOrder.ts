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
    selectedCut
  }: any) => {
    if (!product) return null;
    if (!isFirebaseConfigured) {
      showToast('Login service is temporarily unavailable. Please try again later.', 'error');
      return null;
    }
    const currentUser = getAuth().currentUser;
    if (!currentUser) {
      showToast('Please log in to continue.', 'error');
      return null;
    }

    // Route through /api/orders/create -- firestore.rules forbids writing to
    // `orders` directly from the browser, and the server assigns the order ID/price.
    let orderId: string | null;
    try {
      const token = await currentUser.getIdToken();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/orders/create', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          items: [{
            id: product.id,
            baseId: (product as any).baseId,
            name: product.name,
            quantity,
            price: currentPrice,
            image: product.image,
            selectedWeight: currentUnit || null,
            selectedCut: selectedCut || null,
          }],
          shippingDetails: {
            name: user?.name || '',
            phone: (user as any)?.phone || '',
            address: '',
            pincode: '',
          },
          paymentMethod: 'WhatsApp Express',
          userId: user?.id,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to create order on server');
      }
      orderId = data.orderId;
    } catch (e: any) {
      console.error('Failed to create WhatsApp order:', e);
      showToast(e.message || 'Failed to generate order reference. Please try again.', 'error');
      return null;
    }

    const url = createSingleProductWhatsAppUrl({
      orderId: orderId || undefined,
      customerName: user?.name,
      customerPhone: user?.phone,
      whatsappNumber: settings.whatsappNumber,
      productName: product.name,
      quantity,
      selectedWeight: currentUnit,
      selectedCut: selectedCut || undefined,
      totalPrice: currentPrice * quantity
    });
    window.open(url, '_blank');

    return { url, orderId };
  };
  return { handleWhatsAppOrder };
}
