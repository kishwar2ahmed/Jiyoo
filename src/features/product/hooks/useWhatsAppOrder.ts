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
    customerAddress,
    customerCity,
    customerState,
  }: any) => {
    if (!product) return null;

    const cleanName = String(user?.name || user?.displayName || '').trim();
    const cleanPhone = String((user as any)?.phone || '').trim();
    const cleanAddress = String(customerAddress || '').trim();
    const cleanArea = String(selectedArea || '').trim();
    const cleanCity = String(customerCity || 'Bangalore').trim();
    const cleanState = String(customerState || 'Karnataka').trim();
    const cleanPincode = String(pincode || '').trim();

    // Never redirect to WhatsApp without mandatory customer & delivery details
    if (
      cleanName.length < 2 ||
      cleanPhone.length < 7 ||
      cleanAddress.length < 5 ||
      cleanArea.length < 2 ||
      cleanCity.length < 2 ||
      !/^[1-9]\d{5}$/.test(cleanPincode)
    ) {
      document.dispatchEvent(new CustomEvent('open-whatsapp-checkout'));
      showToast(
        'Please complete your delivery details (Full Name, Mobile Number, Address, Locality, City & PIN Code) to order via WhatsApp.',
        'info'
      );
      return null;
    }

    const safeQty = Math.max(1, Math.min(100, Number(quantity) || 1));
    let orderId: string | null;
    let verificationCode: string | undefined;
    let authoritativeTotal = (Number(currentPrice) || 0) * safeQty;
    let priceVerified: boolean;

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
            name: cleanName,
            phone: cleanPhone,
            address: cleanAddress,
            area: cleanArea,
            city: cleanCity,
            state: cleanState,
            pincode: cleanPincode,
          },
          orderType,
          isSingleProductQuickOrder: true,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        const errMessage = data.error || 'Could not validate WhatsApp order';
        showToast(errMessage, 'error');
        return null;
      }

      orderId = data.orderId || null;
      verificationCode = data.verificationCode || undefined;
      priceVerified = data.priceVerified !== false;
      if (typeof data.grandTotal === 'number' && data.grandTotal > 0) {
        authoritativeTotal = data.grandTotal;
      } else if (typeof data.subtotal === 'number' && data.subtotal > 0) {
        authoritativeTotal = data.subtotal;
      }
    } catch {
      // Network/backend unreachable: clearly mark verification as pending
      priceVerified = false;
      const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const rand = Array.from(crypto.getRandomValues(new Uint8Array(4)))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('')
        .toUpperCase();
      orderId = `JY-${dateStr}-${rand}`;
      verificationCode = `PENDING-${rand.slice(0, 6)}`;
    }

    const url = createSingleProductWhatsAppUrl({
      orderId: orderId || undefined,
      verificationCode,
      orderType,
      customerName: cleanName,
      customerPhone: cleanPhone,
      customerAddress: cleanAddress,
      customerCity: cleanCity,
      customerState: cleanState,
      selectedArea: cleanArea,
      customerPincode: cleanPincode,
      whatsappNumber: settings?.whatsappNumber,
      productName: product.name,
      quantity: safeQty,
      selectedWeight: currentUnit,
      selectedCut: selectedCut || undefined,
      totalPrice: authoritativeTotal,
      priceVerified,
    });

    return { url, orderId, verificationCode, priceVerified };
  };

  return { handleWhatsAppOrder };
}

