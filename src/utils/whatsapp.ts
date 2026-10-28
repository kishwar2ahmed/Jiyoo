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
  customerAddress,
  customerPincode,
  selectedArea,
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
  customerAddress?: string;
  customerPincode?: string;
  selectedArea?: string;
  paymentMethod?: string;
  whatsappNumber?: string;
}) {
  const targetNumber = sanitizeWhatsAppNumber(whatsappNumber);
  const headerLabel = orderType === 'wholesale'
    ? '📦 *NEW WHOLESALE ORDER (PAN-INDIA) - JIYOO*'
    : '🛒 *NEW RETAIL ORDER - JIYOO FRESH STORE*';
  let text = `${headerLabel}\n`;
  if (orderId) {
    text += `🆔 *Order ID:* ${orderId}\n`;
  }
  if (verificationCode) {
    text += `🔐 *Security Token:* ${verificationCode}\n`;
  }
  text += `────────────────────\n`;
  
  items.forEach((item, index) => {
    const itemPrice = getValidPrice(item);
    const weightInfo = item.selectedWeight ? ` (${item.selectedWeight})` : '';
    const cutInfo = item.selectedCut ? ` [Cut: ${item.selectedCut}]` : '';
    text += `${index + 1}. *${item.name}*${weightInfo}${cutInfo}\n   Qty: ${item.quantity} × ₹${itemPrice} = ₹${itemPrice * item.quantity}\n`;
  });

  text += `────────────────────\n`;
  if (typeof subtotal === 'number') {
    text += `📦 *Subtotal:* ₹${subtotal}\n`;
  }
  if (typeof discountAmount === 'number' && discountAmount > 0) {
    text += `🏷️ *Discount:* -₹${discountAmount}\n`;
  }
  if (typeof deliveryFee === 'number') {
    text += `🛵 *Delivery Fee:* ${deliveryFee > 0 ? `₹${deliveryFee}` : 'Free'}\n`;
  }
  text += `💰 *Grand Total:* ₹${totalAmount}\n`;
  text += `💳 *Payment Option:* ${paymentMethod}\n`;
  text += `🚚 *Order Mode:* ${orderType === 'wholesale' ? 'Wholesale (All Over India)' : 'Retail Express'}\n\n`;

  if (customerName || customerPhone || customerAddress || customerPincode || selectedArea) {
    text += `👤 *Delivery Details:*\n`;
    if (customerName) text += `• *Name:* ${customerName}\n`;
    if (customerPhone) text += `• *Phone:* ${customerPhone}\n`;
    if (selectedArea) text += `• *Area:* ${selectedArea}\n`;
    if (customerAddress) text += `• *Address:* ${customerAddress}\n`;
    if (customerPincode) text += `• *PIN Code:* ${customerPincode}\n`;
  } else {
    text += `📍 *Note:* Please reply with your delivery area & address for instant dispatch!\n`;
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
  selectedArea,
  customerPincode,
  productName,
  quantity,
  selectedWeight,
  selectedCut,
  totalPrice,
  whatsappNumber = '919739391891'
}: {
  orderId?: string;
  verificationCode?: string;
  orderType?: 'retail' | 'wholesale';
  customerName?: string;
  customerPhone?: string;
  selectedArea?: string;
  customerPincode?: string;
  productName: string;
  quantity: number;
  selectedWeight?: string;
  selectedCut?: string;
  totalPrice: number;
  whatsappNumber?: string;
}) {
  const targetNumber = sanitizeWhatsAppNumber(whatsappNumber);
  let text = `👋 *HI JIYOO! I want to order this product:*\n\n`;
  if (orderId) text += `🆔 *Order ID:* ${orderId}\n`;
  if (verificationCode) text += `🔐 *Security Token:* ${verificationCode}\n`;
  text += `🚚 *Mode:* ${orderType === 'wholesale' ? 'Wholesale (All India)' : 'Retail Express'}\n\n`;
  text += `🥩 *${productName}*\n`;
  text += `• Quantity: ${quantity}\n`;
  if (selectedWeight) text += `• Weight: ${selectedWeight}\n`;
  if (selectedCut) text += `• Preparation: ${selectedCut}\n`;
  text += `• Verified Total Price: ₹${totalPrice}\n\n`;
  text += `Please confirm order availability and delivery time! 🛵💨\n`;
  if (customerName || customerPhone || selectedArea || customerPincode) {
    text += `\n👤 *Customer Details:*\n`;
    if (customerName) text += `• *Name:* ${customerName}\n`;
    if (customerPhone) text += `• *Phone:* ${customerPhone}\n`;
    if (selectedArea) text += `• *Area:* ${selectedArea}\n`;
    if (customerPincode) text += `• *PIN Code:* ${customerPincode}\n`;
  }

  const encoded = encodeURIComponent(text);
  return `https://wa.me/${targetNumber}?text=${encoded}`;
}
