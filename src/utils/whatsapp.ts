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
  items,
  totalAmount,
  subtotal,
  deliveryFee,
  customerName,
  customerPhone,
  customerAddress,
  customerPincode,
  paymentMethod = 'Cash on Delivery (WhatsApp)',
  whatsappNumber = '919739391891'
}: {
  orderId?: string;
  items: Array<{ name: string; quantity: number; price: number | string; numericPrice?: number; selectedWeight?: string; selectedCut?: string }>;
  totalAmount: number;
  subtotal?: number;
  deliveryFee?: number;
  customerName?: string;
  customerPhone?: string;
  customerAddress?: string;
  customerPincode?: string;
  paymentMethod?: string;
  whatsappNumber?: string;
}) {
  const targetNumber = sanitizeWhatsAppNumber(whatsappNumber);
  let text = `🛒 *NEW ORDER - JIYOO FRESH STORE*\n`;
  if (orderId) {
    text += `🆔 *Order ID:* ${orderId}\n`;
  }
  text += `────────────────────\n`;
  
  items.forEach((item, index) => {
    const itemPrice = getValidPrice(item);
    const weightInfo = item.selectedWeight ? ` (${item.selectedWeight})` : '';
    const cutInfo = item.selectedCut ? ` [Cut: ${item.selectedCut}]` : '';
    text += `${index + 1}. *${item.name}*${weightInfo}${cutInfo}\n   Qty: ${item.quantity} × ₹${itemPrice} = ₹${itemPrice * item.quantity}\n`;
  });

  text += `────────────────────\n`;
  if (typeof subtotal === 'number' && typeof deliveryFee === 'number') {
    text += `📦 *Subtotal:* ₹${subtotal}\n`;
    text += `🛵 *Delivery Fee:* ${deliveryFee > 0 ? `₹${deliveryFee}` : 'Free'}\n`;
  }
  text += `💰 *Grand Total:* ₹${totalAmount}\n`;
  text += `💳 *Payment Option:* ${paymentMethod}\n\n`;

  if (customerName || customerPhone || customerAddress || customerPincode) {
    text += `👤 *Delivery Details:*\n`;
    if (customerName) text += `• *Name:* ${customerName}\n`;
    if (customerPhone) text += `• *Phone:* ${customerPhone}\n`;
    if (customerAddress) text += `• *Address:* ${customerAddress}\n`;
    if (customerPincode) text += `• *Pincode:* ${customerPincode}\n`;
  } else {
    text += `📍 *Note:* Please reply with your delivery address for instant dispatch!\n`;
  }

  const encoded = encodeURIComponent(text);
  return `https://wa.me/${targetNumber}?text=${encoded}`;
}

export function createSingleProductWhatsAppUrl({
  orderId,
  customerName,
  customerPhone,
  productName,
  quantity,
  selectedWeight,
  selectedCut,
  totalPrice,
  whatsappNumber = '919739391891'
}: {
  orderId?: string;
  customerName?: string;
  customerPhone?: string;
  productName: string;
  quantity: number;
  selectedWeight?: string;
  selectedCut?: string;
  totalPrice: number;
  whatsappNumber?: string;
}) {
  const targetNumber = sanitizeWhatsAppNumber(whatsappNumber);
  let text = `👋 *HI JIYOO! I want to order this product:* \n\n`;
  if (orderId) text += `🆔 *Order ID:* ${orderId}\n\n`;
  text += `🥩 *${productName}*\n`;
  text += `• Quantity: ${quantity}\n`;
  if (selectedWeight) text += `• Weight: ${selectedWeight}\n`;
  if (selectedCut) text += `• Preparation: ${selectedCut}\n`;
  text += `• Total Price: ₹${totalPrice}\n\n`;
  text += `Please confirm order availability and delivery time! 🛵💨\n`;
  if (customerName || customerPhone) {
    text += `\n👤 *Customer Details:*\n`;
    if (customerName) text += `• *Name:* ${customerName}\n`;
    if (customerPhone) text += `• *Phone:* ${customerPhone}\n`;
  }

  const encoded = encodeURIComponent(text);
  return `https://wa.me/${targetNumber}?text=${encoded}`;
}
