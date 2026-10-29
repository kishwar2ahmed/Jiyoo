const getValidPrice = (item: any) => {
  const p1 = Number(item.numericPrice);
  if (!isNaN(p1) && p1 > 0) return p1;
  const p2 = parseFloat(String(item.price).replace(/[^0-9.]/g, ""));
  return isNaN(p2) ? 0 : p2;
};

export function sanitizeWhatsAppNumber(num?: string): string {
  if (num && num.trim()) {
    const clean = num.replace(/\D/g, '');
    if (clean.length >= 10) return clean;
  }
  return '919739391891';
}

export function createWhatsAppOrderUrl({
  orderId,
  verificationCode,
  orderType = 'retail',
  items,
  totalAmount,
  subtotal,
  discountAmount,
  deliveryFee,
  customerName,
  customerPhone,
  customerWhatsappPhone,
  customerHouseNo,
  customerStreet,
  customerAddress,
  customerCity,
  customerState,
  customerPincode,
  customerLandmark,
  customerAddressType,
  deliveryInstructions,
  selectedArea,
  priceVerified = true,
  paymentMethod = 'Cash on Delivery (WhatsApp)',
  whatsappNumber = '919739391891'
}: {
  orderId?: string;
  verificationCode?: string;
  orderType?: 'retail' | 'wholesale';
  items: Array<{ name: string; quantity: number; price: number | string; numericPrice?: number; selectedWeight?: string; selectedCut?: string }>;
  totalAmount: number;
  subtotal?: number;
  discountAmount?: number;
  deliveryFee?: number;
  customerName?: string;
  customerPhone?: string;
  customerWhatsappPhone?: string;
  customerHouseNo?: string;
  customerStreet?: string;
  customerAddress?: string;
  customerCity?: string;
  customerState?: string;
  customerPincode?: string;
  customerLandmark?: string;
  customerAddressType?: string;
  deliveryInstructions?: string;
  selectedArea?: string;
  priceVerified?: boolean;
  paymentMethod?: string;
  whatsappNumber?: string;
}) {
  const targetNumber = sanitizeWhatsAppNumber(whatsappNumber);
  const headerLabel = orderType === 'wholesale'
    ? '📦 *NEW WHOLESALE ORDER (PAN-INDIA) - JIYOO*'
    : '🛒 *NEW RETAIL ORDER - JIYOO FRESH STORE*';
  let text = `${headerLabel}\n`;
  if (orderId) {
    text += `🆔 *Order Reference:* ${orderId}\n`;
  }
  if (verificationCode) {
    text += `🔐 *Security Token:* ${verificationCode}\n`;
  }
  text += `📋 *Status:* AWAITING_WHATSAPP_CONFIRMATION\n`;
  if (!priceVerified) {
    text += `⚠️ *Verification:* Price & stock verification pending on server\n`;
  }
  text += `────────────────────\n`;
  
  items.forEach((item, index) => {
    const itemPrice = getValidPrice(item);
    const weightInfo = item.selectedWeight ? ` (${item.selectedWeight})` : '';
    const cutInfo = item.selectedCut ? ` [Cut: ${item.selectedCut}]` : '';
    const priceTag = priceVerified ? `₹${itemPrice}` : `₹${itemPrice} (unverified)`;
    text += `${index + 1}. *${item.name}*${weightInfo}${cutInfo}\n   Qty: ${item.quantity} × ${priceTag} = ₹${itemPrice * item.quantity}\n`;
  });

  text += `────────────────────\n`;
  if (typeof subtotal === 'number') {
    text += `📦 *Subtotal:* ₹${subtotal}${priceVerified ? '' : ' (pending verification)'}\n`;
  }
  if (typeof discountAmount === 'number' && discountAmount > 0) {
    text += `🏷️ *Discount:* -₹${discountAmount}\n`;
  }
  if (typeof deliveryFee === 'number') {
    text += `🛵 *Delivery Fee:* ${deliveryFee > 0 ? `₹${deliveryFee}` : 'Free'}\n`;
  }
  text += `💰 *Order Total:* ₹${totalAmount}${priceVerified ? ' (Server Verified)' : ' (Pending Verification)'}\n`;
  text += `💳 *Payment Preference:* ${paymentMethod}\n`;
  text += `🚚 *Order Mode:* ${orderType === 'wholesale' ? 'Wholesale (All Over India)' : 'Retail Express'}\n\n`;

  if (customerName || customerPhone || customerAddress || customerPincode || selectedArea) {
    text += `👤 *Customer & Delivery Details:*\n`;
    if (customerName) text += `• *Full Name:* ${customerName}\n`;
    if (customerPhone) text += `• *Mobile:* ${customerPhone}\n`;
    if (customerWhatsappPhone && customerWhatsappPhone !== customerPhone) {
      text += `• *WhatsApp:* ${customerWhatsappPhone}\n`;
    }
    if (customerAddressType) text += `• *Address Type:* ${customerAddressType}\n`;
    if (customerHouseNo) text += `• *House / Flat No:* ${customerHouseNo}\n`;
    if (customerStreet) text += `• *Building / Street:* ${customerStreet}\n`;
    if (selectedArea) text += `• *Area / Locality:* ${selectedArea}\n`;
    if (customerAddress && (!customerHouseNo || !customerStreet)) {
      text += `• *Address:* ${customerAddress}\n`;
    }
    if (customerLandmark) text += `• *Landmark:* ${customerLandmark}\n`;
    if (customerCity || customerState) {
      text += `• *City / State:* ${[customerCity, customerState].filter(Boolean).join(', ')}\n`;
    }
    if (customerPincode) text += `• *PIN Code:* ${customerPincode}\n`;
    if (deliveryInstructions) text += `• *Instructions:* ${deliveryInstructions}\n`;
  }

  const encoded = encodeURIComponent(text);
  return `https://wa.me/${targetNumber}?text=${encoded}`;
}

export function createSingleProductWhatsAppUrl({
  orderId,
  verificationCode,
  orderType = 'retail',
  customerName,
  customerPhone,
  customerAddress,
  customerCity,
  customerState,
  selectedArea,
  customerPincode,
  productName,
  quantity,
  selectedWeight,
  selectedCut,
  totalPrice,
  priceVerified = true,
  whatsappNumber = '919739391891'
}: {
  orderId?: string;
  verificationCode?: string;
  orderType?: 'retail' | 'wholesale';
  customerName?: string;
  customerPhone?: string;
  customerAddress?: string;
  customerCity?: string;
  customerState?: string;
  selectedArea?: string;
  customerPincode?: string;
  productName: string;
  quantity: number;
  selectedWeight?: string;
  selectedCut?: string;
  totalPrice: number;
  priceVerified?: boolean;
  whatsappNumber?: string;
}) {
  const targetNumber = sanitizeWhatsAppNumber(whatsappNumber);
  let text = `👋 *HI JIYOO! I want to order this product:*\n\n`;
  if (orderId) text += `🆔 *Order Reference:* ${orderId}\n`;
  if (verificationCode) text += `🔐 *Security Token:* ${verificationCode}\n`;
  text += `📋 *Status:* AWAITING_WHATSAPP_CONFIRMATION\n`;
  text += `🚚 *Mode:* ${orderType === 'wholesale' ? 'Wholesale (All India)' : 'Retail Express'}\n\n`;
  text += `🥩 *${productName}*\n`;
  text += `• Quantity: ${quantity}\n`;
  if (selectedWeight) text += `• Weight: ${selectedWeight}\n`;
  if (selectedCut) text += `• Preparation: ${selectedCut}\n`;
  text += `• ${priceVerified ? 'Verified Total Price' : 'Estimated Price (Pending Verification)'}: ₹${totalPrice}\n\n`;
  text += `Please confirm order availability and delivery time!\n`;
  if (customerName || customerPhone || customerAddress || selectedArea || customerPincode) {
    text += `\n👤 *Customer Details:*\n`;
    if (customerName) text += `• *Name:* ${customerName}\n`;
    if (customerPhone) text += `• *Phone:* ${customerPhone}\n`;
    if (selectedArea) text += `• *Area / Locality:* ${selectedArea}\n`;
    if (customerAddress) text += `• *Address:* ${customerAddress}\n`;
    if (customerCity || customerState) {
      text += `• *City / State:* ${[customerCity, customerState].filter(Boolean).join(', ')}\n`;
    }
    if (customerPincode) text += `• *PIN Code:* ${customerPincode}\n`;
  }

  const encoded = encodeURIComponent(text);
  return `https://wa.me/${targetNumber}?text=${encoded}`;
}

