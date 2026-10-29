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
  paymentMethod = 'Cash on Delivery / Direct UPI',
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
    ? '📦 *NEW WHOLESALE ORDER - WELCOME TO JIYOO*'
    : '🛒 *NEW RETAIL ORDER - WELCOME TO JIYOO*';

  const refId = orderId || `JYO-${Date.now().toString().slice(-6)}`;
  const token = verificationCode || Math.random().toString(36).substring(2, 8).toUpperCase();

  let text = `${headerLabel}\n`;
  text += `🆔 *Order Reference:* \`\`\`${refId}\`\`\`\n`;
  text += `🔐 *Security Token:* \`\`\`${token}\`\`\`\n`;
  text += `📋 *Status:* Confirmed (Processing)\n`;
  text += `⚠️ *Verification:* ${priceVerified ? 'Verified & Quality Checked' : 'Pending Verification'}\n`;
  text += `────────────────────\n`;

  items.forEach((item, index) => {
    const itemPrice = getValidPrice(item);
    const weightInfo = item.selectedWeight ? ` (${item.selectedWeight})` : '';
    const cutInfo = item.selectedCut ? ` [Cut: ${item.selectedCut}]` : '';
    const lineTotal = itemPrice * item.quantity;
    text += `${index + 1}. *${item.name}*${weightInfo}${cutInfo}\n   Qty: ${item.quantity} × ₹${itemPrice} = *₹${lineTotal}*\n`;
  });

  text += `────────────────────\n`;
  const effectiveSubtotal = typeof subtotal === 'number' ? subtotal : totalAmount;
  text += `📦 *Subtotal:* ₹${effectiveSubtotal}\n`;
  if (typeof discountAmount === 'number' && discountAmount > 0) {
    text += `🏷️ *Discount:* -₹${discountAmount}\n`;
  }
  const feeText = typeof deliveryFee === 'number' && deliveryFee > 0 ? `₹${deliveryFee}` : 'Free';
  text += `🛵 *Delivery Fee:* ${feeText}\n`;
  text += `💰 *Order Total:* *₹${totalAmount}*\n`;
  text += `💳 *Payment Preference:* ${paymentMethod}\n`;
  text += `🚚 *Order Mode:* ${orderType === 'wholesale' ? 'Wholesale Express (B2B)' : 'Retail Express (Fresh Delivery)'}\n\n`;

  text += `👤 *Customer & Delivery Details:*\n`;
  const displayName = customerName && customerName.trim() ? customerName.trim() : 'Valued Customer';
  text += `• *Full Name:* ${displayName}\n`;
  text += `• *Mobile:* ${customerPhone || 'N/A'}\n`;
  if (customerWhatsappPhone && customerWhatsappPhone !== customerPhone) {
    text += `• *WhatsApp:* ${customerWhatsappPhone}\n`;
  }

  const areaLabel = selectedArea || (customerCity ? `${customerCity}` : 'Bangalore');
  text += `• *Area / Locality:* ${areaLabel}\n`;

  const structuredAddressParts = [customerHouseNo, customerStreet, customerCity, customerState].filter(Boolean);
  const fullAddress = customerAddress || (structuredAddressParts.length > 0 ? structuredAddressParts.join(', ') : 'Delivery address provided');
  text += `• *Address:* ${fullAddress}\n`;

  if (customerLandmark) {
    text += `• *Landmark:* ${customerLandmark}\n`;
  }
  if (customerAddressType) {
    text += `• *Address Type:* ${customerAddressType}\n`;
  }
  text += `• *PIN Code:* ${customerPincode || 'N/A'}\n`;
  if (deliveryInstructions) {
    text += `• *Instructions:* ${deliveryInstructions}\n`;
  }

  const customerNameUpper = displayName.toUpperCase();
  text += `\n────────────────────\n`;
  text += `THANK YOU FOR JOINING US, *${customerNameUpper}*\n`;
  text += `PLEASE VISIT AGAIN\n`;

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
  paymentMethod = 'Cash on Delivery / Direct UPI',
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
  paymentMethod?: string;
  whatsappNumber?: string;
}) {
  const targetNumber = sanitizeWhatsAppNumber(whatsappNumber);
  const headerLabel = orderType === 'wholesale'
    ? '📦 *NEW WHOLESALE ORDER - WELCOME TO JIYOO*'
    : '🛒 *NEW RETAIL ORDER - WELCOME TO JIYOO*';

  const refId = orderId || `JYO-${Date.now().toString().slice(-6)}`;
  const token = verificationCode || Math.random().toString(36).substring(2, 8).toUpperCase();

  let text = `${headerLabel}\n`;
  text += `🆔 *Order Reference:* \`\`\`${refId}\`\`\`\n`;
  text += `🔐 *Security Token:* \`\`\`${token}\`\`\`\n`;
  text += `📋 *Status:* Confirmed (Processing)\n`;
  text += `⚠️ *Verification:* ${priceVerified ? 'Verified & Quality Checked' : 'Pending Verification'}\n`;
  text += `────────────────────\n`;

  const weightInfo = selectedWeight ? ` (${selectedWeight})` : '';
  const cutInfo = selectedCut ? ` [Cut: ${selectedCut}]` : '';
  const unitPrice = quantity > 0 ? Math.round(totalPrice / quantity) : totalPrice;
  text += `1. *${productName}*${weightInfo}${cutInfo}\n   Qty: ${quantity} × ₹${unitPrice} = *₹${totalPrice}*\n`;

  text += `────────────────────\n`;
  text += `📦 *Subtotal:* ₹${totalPrice}\n`;
  text += `🛵 *Delivery Fee:* Free\n`;
  text += `💰 *Order Total:* *₹${totalPrice}*\n`;
  text += `💳 *Payment Preference:* ${paymentMethod}\n`;
  text += `🚚 *Order Mode:* ${orderType === 'wholesale' ? 'Wholesale Express (B2B)' : 'Retail Express (Fresh Delivery)'}\n\n`;

  text += `👤 *Customer & Delivery Details:*\n`;
  const displayName = customerName && customerName.trim() ? customerName.trim() : 'Valued Customer';
  text += `• *Full Name:* ${displayName}\n`;
  text += `• *Mobile:* ${customerPhone || 'N/A'}\n`;

  const areaLabel = selectedArea || (customerCity ? `${customerCity}` : 'Bangalore');
  text += `• *Area / Locality:* ${areaLabel}\n`;

  const addressLine = customerAddress || [customerCity, customerState].filter(Boolean).join(', ') || 'Delivery address provided';
  text += `• *Address:* ${addressLine}\n`;
  text += `• *PIN Code:* ${customerPincode || 'N/A'}\n`;

  const customerNameUpper = displayName.toUpperCase();
  text += `\n────────────────────\n`;
  text += `THANK YOU FOR JOINING US, *${customerNameUpper}*\n`;
  text += `PLEASE VISIT AGAIN\n`;

  const encoded = encodeURIComponent(text);
  return `https://wa.me/${targetNumber}?text=${encoded}`;
}

