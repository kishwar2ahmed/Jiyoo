import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

export interface SmtpConfig {
  host?: string;
  port?: number | string;
  user?: string;
  pass?: string;
  from?: string;
}

export interface StatusEmailParams {
  orderId: string;
  newStatus: string;
  previousStatus?: string;
  reason?: string | null;
  trackingCarrier?: string | null;
  trackingNumber?: string | null;
  trackingUrl?: string | null;
  actor?: string;
  db: any;
  auth?: any;
  smtpConfig: SmtpConfig;
  storeName?: string;
  appUrl?: string;
  force?: boolean;
}

export interface SendStatusEmailResult {
  success: boolean;
  messageId?: string;
  recipient?: string;
  reason?: string;
  duplicateSkipped?: boolean;
  isMock?: boolean;
}

// Sanitize dynamic user/order strings to prevent HTML injection inside emails
export function sanitizeEmailHtml(str: any): string {
  if (typeof str !== 'string') return String(str ?? '');
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function isValidEmailAddress(email: unknown): boolean {
  if (typeof email !== 'string') return false;
  const trimmed = email.trim();
  if (trimmed.length < 5 || trimmed.length > 254) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
}

/**
 * Robustly resolves the customer email from multiple potential locations on the order,
 * related user profile document, or Firebase Auth record.
 */
export async function resolveCustomerEmail(order: any, db?: any, auth?: any): Promise<string | null> {
  if (!order || typeof order !== 'object') return null;

  // 1. Direct email fields on the order document
  const directCandidates = [
    order.customerEmail,
    order.email,
    order.userEmail,
    order.shippingDetails?.email,
    order.shippingDetails?.customerEmail,
    order.billingDetails?.email,
    order.contactEmail,
  ];

  for (const candidate of directCandidates) {
    if (isValidEmailAddress(candidate)) {
      return candidate.trim().toLowerCase();
    }
  }

  // 2. Lookup via userId in Firestore users collection
  const userId = typeof order.userId === 'string' ? order.userId.trim() : '';
  if (userId && !userId.startsWith('guest_') && db && typeof db.collection === 'function') {
    try {
      const userSnap = await db.collection('users').doc(userId).get();
      if (userSnap.exists) {
        const userData = userSnap.data() || {};
        const userEmail = userData.email || userData.userEmail;
        if (isValidEmailAddress(userEmail)) {
          return userEmail.trim().toLowerCase();
        }
      }
    } catch (err) {
      console.warn(`[Order Email] Could not lookup user doc for userId ${userId}:`, (err as any)?.message || err);
    }
  }

  // 3. Lookup via Firebase Admin Auth if available
  if (userId && !userId.startsWith('guest_') && auth && typeof auth.getUser === 'function') {
    try {
      const userRecord = await auth.getUser(userId);
      if (userRecord && isValidEmailAddress(userRecord.email)) {
        return userRecord.email.trim().toLowerCase();
      }
    } catch {
      // User may not exist in Firebase Auth or guest UID
    }
  }

  return null;
}

export interface StatusPresentation {
  label: string;
  badge: string;
  color: string;
  bgColor: string;
  borderColor: string;
  headline: string;
  description: string;
  activeStep: number; // 1 to 4
}

export function getStatusPresentation(status: string): StatusPresentation {
  const s = String(status || '').trim().toLowerCase();

  switch (s) {
    case 'awaiting_whatsapp_confirmation':
    case 'whatsapp_pending':
      return {
        label: 'Awaiting WhatsApp Confirmation',
        badge: 'WhatsApp Pending',
        color: '#047857',
        bgColor: '#ECFDF5',
        borderColor: '#A7F3D0',
        headline: 'WhatsApp Trade Confirmation in Progress',
        description: 'Your quick-order has been logged with our central desk. Our WhatsApp concierge is confirming your delivery address and schedule.',
        activeStep: 1,
      };

    case 'received':
    case 'pending':
      return {
        label: 'Order Placed & Received',
        badge: '🟡 Order Placed',
        color: '#B45309',
        bgColor: '#FEF3C7',
        borderColor: '#FDE68A',
        headline: 'We Have Received Your Order',
        description: 'Thank you for choosing JIYOO. Our team has received your order and queued it for procurement of today\'s freshest harvest.',
        activeStep: 1,
      };

    case 'confirmed':
      return {
        label: 'Order Confirmed',
        badge: '🔵 Order Confirmed',
        color: '#1D4ED8',
        bgColor: '#EFF6FF',
        borderColor: '#BFDBFE',
        headline: 'Your Order is Confirmed & Scheduled',
        description: 'Your order has been officially confirmed by our fulfillment team. Farm lots and custom cuts are being allocated for morning dispatch.',
        activeStep: 2,
      };

    case 'processing':
      return {
        label: 'Fresh Prep & Quality Check',
        badge: '⚙️ Processing',
        color: '#0369A1',
        bgColor: '#F0F9FF',
        borderColor: '#BAE6FD',
        headline: 'Selecting & Preparing Your Harvest',
        description: 'Our cut-masters and quality inspectors are hand-selecting, dressing, and RO-washing your items in temperature-controlled chambers.',
        activeStep: 2,
      };

    case 'packed':
      return {
        label: 'Cold-Chain Packed',
        badge: '📦 Packed & Sealed',
        color: '#0F766E',
        bgColor: '#F0FDFA',
        borderColor: '#99F6E4',
        headline: 'Packed in Sanitized Thermal Containers',
        description: 'Your harvest has passed freshness verification and is sealed in food-grade thermal containers, ready for courier pickup.',
        activeStep: 3,
      };

    case 'dispatched':
    case 'shipped':
      return {
        label: 'Dispatched & En Route',
        badge: '🚚 Dispatched',
        color: '#047857',
        bgColor: '#ECFDF5',
        borderColor: '#6EE7B7',
        headline: 'Your Order Has Been Dispatched',
        description: 'Your consignment is now in transit in a refrigerated, cold-chain vehicle headed toward your delivery destination.',
        activeStep: 3,
      };

    case 'out_for_delivery':
      return {
        label: 'Out for Doorstep Delivery',
        badge: '🛵 Out for Delivery',
        color: '#059669',
        bgColor: '#D1FAE5',
        borderColor: '#34D399',
        headline: 'Our Delivery Executive is on the Way',
        description: 'Your fresh harvest is out for final delivery. Please keep your phone reachable so the delivery partner can hand over your parcel.',
        activeStep: 4,
      };

    case 'delivered':
    case 'completed':
      return {
        label: 'Delivered Successfully',
        badge: '✅ Delivered',
        color: '#065F46',
        bgColor: '#ECFDF5',
        borderColor: '#10B981',
        headline: 'Delivered to Your Doorstep',
        description: 'Your order has been delivered! We hope you enjoy the farm-fresh produce and artisanal cuts. If anything is amiss, remember our 100% Doorstep Freshness Guarantee.',
        activeStep: 4,
      };

    case 'cancelled':
      return {
        label: 'Order Cancelled',
        badge: '🔴 Cancelled',
        color: '#BE123C',
        bgColor: '#FFF1F2',
        borderColor: '#FECDD3',
        headline: 'Your Order Has Been Cancelled',
        description: 'This order has been cancelled. Any pre-paid amount has been initiated for immediate refund back to your original source of payment.',
        activeStep: 0,
      };

    default:
      return {
        label: status.replace(/_/g, ' ').toUpperCase(),
        badge: `Status: ${status}`,
        color: '#44403C',
        bgColor: '#F5F5F4',
        borderColor: '#E7E5E4',
        headline: `Order Status: ${status}`,
        description: `Your order status has been updated to "${status}".`,
        activeStep: 2,
      };
  }
}

/**
 * Builds an ultra-premium, responsive, HTML email template for order status updates.
 */
export function buildOrderStatusEmailHtml(params: {
  order: any;
  orderId: string;
  newStatus: string;
  previousStatus?: string;
  reason?: string | null;
  trackingCarrier?: string | null;
  trackingNumber?: string | null;
  trackingUrl?: string | null;
  storeName: string;
  appUrl: string;
}): { html: string; text: string; subject: string } {
  const {
    order,
    orderId,
    newStatus,
    reason,
    trackingCarrier,
    trackingNumber,
    trackingUrl,
    storeName,
    appUrl,
  } = params;

  const presentation = getStatusPresentation(newStatus);
  const safeStoreName = sanitizeEmailHtml(storeName);
  const safeOrderId = sanitizeEmailHtml(orderId);
  const customerName = sanitizeEmailHtml(order?.shippingDetails?.name || 'Valued Customer');
  const safeAddress = sanitizeEmailHtml(order?.shippingDetails?.address || 'Provided at checkout');
  const safePhone = sanitizeEmailHtml(order?.shippingDetails?.phone || '');
  const paymentMethod = sanitizeEmailHtml(order?.paymentMethod || 'Cash on Delivery');
  const grandTotal = Number(order?.grandTotal ?? order?.amount ?? 0);
  const subtotal = Number(order?.subtotal ?? grandTotal);
  const deliveryFee = Number(order?.deliveryFee ?? 0);
  const discountAmount = Number(order?.discountAmount ?? 0);
  const couponCode = order?.couponCode ? sanitizeEmailHtml(order.couponCode) : null;

  const items = Array.isArray(order?.items) ? order.items : [];

  const itemsRowsHtml = items
    .map((item: any) => {
      const name = sanitizeEmailHtml(item.name || 'Item');
      const qty = Number(item.quantity || 1);
      const price = Number(item.price || 0);
      const rowTotal = price * qty;
      const weightInfo = item.selectedWeight ? ` <span style="color:#78716C;font-size:11px;">(${sanitizeEmailHtml(item.selectedWeight)})</span>` : '';
      const cutInfo = item.selectedCut ? ` <span style="color:#78716C;font-size:11px;">[${sanitizeEmailHtml(item.selectedCut)}]</span>` : '';

      return `
        <tr>
          <td style="padding:12px 0;border-bottom:1px solid #F0EEE9;font-size:13px;color:#1C1917;">
            <strong>${name}</strong>${weightInfo}${cutInfo}
            <div style="font-size:11px;color:#78716C;margin-top:2px;">₹${price.toLocaleString('en-IN')} × ${qty}</div>
          </td>
          <td style="padding:12px 0;border-bottom:1px solid #F0EEE9;font-size:13px;font-weight:600;color:#1C1917;text-align:right;white-space:nowrap;font-family:monospace;">
            ₹${rowTotal.toLocaleString('en-IN')}
          </td>
        </tr>
      `;
    })
    .join('');

  // 4-step progress visual tracker
  const steps = [
    { num: 1, label: 'Ordered' },
    { num: 2, label: 'Confirmed' },
    { num: 3, label: 'Dispatched' },
    { num: 4, label: 'Delivered' },
  ];

  const stepsHtml = presentation.activeStep > 0
    ? `
      <div style="background:#FFFFFF;border:1px solid #E7E3DA;border-radius:12px;padding:16px 20px;margin-bottom:24px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
          <tr>
            ${steps
              .map((step) => {
                const isPassed = step.num <= presentation.activeStep;
                const isCurrent = step.num === presentation.activeStep;
                const circleBg = isCurrent ? '#047857' : isPassed ? '#10B981' : '#E7E3DA';
                const circleColor = isPassed ? '#FFFFFF' : '#78716C';
                const textColor = isPassed ? '#1C1917' : '#A8A29E';
                const textWeight = isCurrent ? '700' : '500';

                return `
                  <td align="center" style="width:25%;vertical-align:top;padding:0 4px;">
                    <div style="width:26px;height:26px;border-radius:50%;background:${circleBg};color:${circleColor};font-size:11px;font-weight:700;line-height:26px;text-align:center;margin:0 auto 6px auto;">
                      ${isPassed ? '✓' : step.num}
                    </div>
                    <div style="font-size:10px;text-transform:uppercase;letter-spacing:0.5px;color:${textColor};font-weight:${textWeight};">
                      ${step.label}
                    </div>
                  </td>
                `;
              })
              .join('')}
          </tr>
        </table>
      </div>
    `
    : '';

  // Carrier tracking callout if available
  const effectiveCarrier = trackingCarrier || order?.trackingCarrier;
  const effectiveTrackingNum = trackingNumber || order?.trackingNumber;
  const effectiveTrackingUrl = trackingUrl || order?.trackingUrl;

  const trackingBoxHtml = (effectiveCarrier || effectiveTrackingNum || effectiveTrackingUrl)
    ? `
      <div style="background:#F0FDF4;border:1px solid #BBF7D0;border-radius:12px;padding:16px 20px;margin-bottom:24px;">
        <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#047857;margin-bottom:6px;">
          Cold-Chain Courier &amp; Transit Details
        </div>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:13px;color:#1C1917;">
          ${effectiveCarrier ? `<tr><td style="padding:2px 0;color:#78716C;width:120px;">Carrier / Fleet:</td><td style="padding:2px 0;font-weight:600;">${sanitizeEmailHtml(effectiveCarrier)}</td></tr>` : ''}
          ${effectiveTrackingNum ? `<tr><td style="padding:2px 0;color:#78716C;">Waybill / AWB:</td><td style="padding:2px 0;font-family:monospace;font-weight:700;">${sanitizeEmailHtml(effectiveTrackingNum)}</td></tr>` : ''}
          ${effectiveTrackingUrl ? `<tr><td style="padding:4px 0;" colspan="2"><a href="${sanitizeEmailHtml(effectiveTrackingUrl)}" style="color:#047857;font-weight:600;text-decoration:underline;">Track live consignment</a></td></tr>` : ''}
        </table>
      </div>
    `
    : '';

  // Admin note or reason callout if present
  const effectiveReason = reason || order?.statusChangeReason;
  const reasonBoxHtml = effectiveReason
    ? `
      <div style="background:#FAF9F5;border-left:4px solid #8A5A36;border-radius:0 8px 8px 0;padding:14px 18px;margin-bottom:24px;">
        <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#8A5A36;margin-bottom:4px;">
          Note From Fulfillment Team
        </div>
        <div style="font-size:13px;color:#44403C;line-height:1.5;">
          ${sanitizeEmailHtml(effectiveReason)}
        </div>
      </div>
    `
    : '';

  const cleanAppUrl = (appUrl || '').replace(/\/+$/, '');
  const trackOrderUrl = `${cleanAppUrl}/?trackOrder=${encodeURIComponent(orderId)}`;
  const whatsappSupportUrl = 'https://wa.me/919739391891?text=' + encodeURIComponent(`Hello JIYOO, I have a query about my order #${orderId}`);

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${presentation.label} - Order #${safeOrderId}</title>
</head>
<body style="margin:0;padding:0;background-color:#F5F3EF;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;color:#1C1917;">
  <div style="max-width:600px;margin:0 auto;padding:24px 16px;">
    
    <!-- Top Hairline Accent -->
    <div style="height:3px;background:linear-gradient(90deg, #8A5A36, #D4AF37, #8A5A36);border-radius:3px 3px 0 0;"></div>

    <!-- Main Container -->
    <div style="background:#FFFFFF;border:1px solid #E7E3DA;border-top:none;border-radius:0 0 16px 16px;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,0.04);">
      
      <!-- Brand Header -->
      <div style="background:#FAF9F5;padding:24px 28px;border-bottom:1px solid #E7E3DA;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td valign="middle">
              <span style="font-family:Georgia,serif;font-size:22px;font-weight:bold;letter-spacing:2px;color:#1C1917;text-transform:uppercase;">
                ${safeStoreName}
              </span>
              <div style="font-size:10px;text-transform:uppercase;letter-spacing:1.5px;color:#8A5A36;margin-top:2px;">
                Fresh Harvest &amp; Fine Wholesale
              </div>
            </td>
            <td align="right" valign="middle">
              <div style="display:inline-block;background:#FFFFFF;border:1px solid #E7E3DA;border-radius:6px;padding:6px 10px;font-family:monospace;font-size:11px;font-weight:bold;color:#1C1917;">
                #${safeOrderId}
              </div>
            </td>
          </tr>
        </table>
      </div>

      <!-- Main Body -->
      <div style="padding:28px;">
        
        <!-- Status Hero Banner -->
        <div style="background:${presentation.bgColor};border:1px solid ${presentation.borderColor};border-radius:12px;padding:20px;margin-bottom:24px;text-align:center;">
          <div style="display:inline-block;background:${presentation.color};color:#FFFFFF;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1.2px;padding:4px 12px;border-radius:20px;margin-bottom:10px;">
            ${presentation.badge}
          </div>
          <h1 style="margin:0 0 8px 0;font-family:Georgia,serif;font-size:20px;font-weight:bold;color:#1C1917;">
            ${presentation.headline}
          </h1>
          <p style="margin:0;font-size:13px;line-height:1.5;color:#44403C;">
            ${presentation.description}
          </p>
        </div>

        <!-- 4-Step Visual Tracker -->
        ${stepsHtml}

        <!-- Admin Note or Status Reason -->
        ${reasonBoxHtml}

        <!-- Courier / Tracking Details (if any) -->
        ${trackingBoxHtml}

        <!-- Customer Greeting -->
        <div style="font-size:14px;color:#1C1917;line-height:1.6;margin-bottom:20px;">
          Hi <strong>${customerName}</strong>,
          <br>
          Here is an update on your order placed with <strong>${safeStoreName}</strong>. You can follow your order delivery status online or contact our concierge desk directly at any time.
        </div>

        <!-- Order Items Summary Table -->
        <div style="background:#FAF9F5;border:1px solid #E7E3DA;border-radius:12px;padding:20px;margin-bottom:24px;">
          <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#78716C;padding-bottom:10px;border-bottom:1px solid #E7E3DA;margin-bottom:8px;">
            Order Summary
          </div>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
            ${itemsRowsHtml || '<tr><td style="padding:10px 0;font-size:13px;color:#78716C;">Fresh Harvest Selection</td></tr>'}
          </table>

          <!-- Financial Breakdown -->
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-top:14px;font-size:12px;color:#57534E;">
            <tr>
              <td style="padding:4px 0;">Subtotal</td>
              <td style="padding:4px 0;text-align:right;font-family:monospace;">₹${subtotal.toLocaleString('en-IN')}</td>
            </tr>
            ${discountAmount > 0 ? `
            <tr>
              <td style="padding:4px 0;color:#047857;">Coupon Discount ${couponCode ? `(${couponCode})` : ''}</td>
              <td style="padding:4px 0;text-align:right;font-family:monospace;color:#047857;">-₹${discountAmount.toLocaleString('en-IN')}</td>
            </tr>
            ` : ''}
            <tr>
              <td style="padding:4px 0;">Cold-Chain Express Delivery</td>
              <td style="padding:4px 0;text-align:right;font-family:monospace;">${deliveryFee === 0 ? '<span style="color:#047857;font-weight:bold;">FREE</span>' : `₹${deliveryFee.toLocaleString('en-IN')}`}</td>
            </tr>
            <tr style="border-top:1px solid #E7E3DA;">
              <td style="padding:10px 0 0 0;font-size:14px;font-weight:700;color:#1C1917;">Total Amount</td>
              <td style="padding:10px 0 0 0;text-align:right;font-size:16px;font-weight:700;font-family:monospace;color:#1C1917;">₹${grandTotal.toLocaleString('en-IN')}</td>
            </tr>
            <tr>
              <td colspan="2" style="padding-top:4px;font-size:11px;color:#78716C;">
                Payment Method: <strong>${paymentMethod}</strong>
              </td>
            </tr>
          </table>
        </div>

        <!-- Delivery Address Details -->
        <div style="background:#FFFFFF;border:1px solid #E7E3DA;border-radius:12px;padding:16px 20px;margin-bottom:28px;">
          <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#78716C;margin-bottom:6px;">
            Delivery Address
          </div>
          <div style="font-size:13px;line-height:1.5;color:#1C1917;">
            <strong>${customerName}</strong><br>
            ${safeAddress}<br>
            ${safePhone ? `<span style="color:#57534E;font-size:12px;">Contact: ${safePhone}</span>` : ''}
          </div>
        </div>

        <!-- Action Buttons -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
          <tr>
            <td align="center" style="padding-bottom:12px;">
              <a href="${trackOrderUrl}" target="_blank" style="display:inline-block;width:100%;box-sizing:border-box;background:#1C1917;color:#FFFFFF;text-align:center;padding:14px 20px;font-size:13px;font-weight:600;letter-spacing:0.3px;text-decoration:none;border-radius:10px;">
                Track Live Order Status
              </a>
            </td>
          </tr>
          <tr>
            <td align="center">
              <a href="${whatsappSupportUrl}" target="_blank" style="display:inline-block;width:100%;box-sizing:border-box;background:#25D366;color:#FFFFFF;text-align:center;padding:12px 20px;font-size:12px;font-weight:600;letter-spacing:0.3px;text-decoration:none;border-radius:10px;">
                Message WhatsApp Concierge
              </a>
            </td>
          </tr>
        </table>

      </div>

      <!-- Footer -->
      <div style="background:#FAF9F5;padding:24px 28px;border-top:1px solid #E7E3DA;font-size:11px;color:#78716C;line-height:1.6;text-align:center;">
        <div style="font-weight:600;color:#1C1917;margin-bottom:4px;">
          ${safeStoreName} · FSSAI Reg. No. 21226112000732 · MSME: UDYAM-KR-19-0005999
        </div>
        <div>
          Daily Morning Harvest &amp; Temperature-Controlled Cold-Chain Logistics · Bengaluru, Karnataka, India
        </div>
        <div style="margin-top:8px;">
          Direct Support: <a href="tel:+919739391891" style="color:#047857;text-decoration:none;">+91 97393 91891</a> · <a href="mailto:shamsjiyoo@gmail.com" style="color:#047857;text-decoration:none;">shamsjiyoo@gmail.com</a>
        </div>
        <div style="margin-top:12px;font-size:10px;color:#A8A29E;">
          You received this transactional update because you placed order #${safeOrderId} on ${safeStoreName}.
        </div>
      </div>

    </div>
  </div>
</body>
</html>
  `.trim();

  const text = `
${storeName.toUpperCase()} — ORDER STATUS UPDATE
====================================================
Order ID: #${orderId}
Status: ${presentation.label} (${presentation.badge})

${presentation.headline}
${presentation.description}

${reason ? `Note: ${reason}\n` : ''}${effectiveCarrier ? `Carrier: ${effectiveCarrier}\n` : ''}${effectiveTrackingNum ? `Tracking Number: ${effectiveTrackingNum}\n` : ''}
Customer: ${customerName}
Delivery Address: ${safeAddress}
Phone: ${safePhone}

ORDER SUMMARY:
${items.map((i: any) => `- ${i.name} (${i.selectedWeight || ''}) x ${i.quantity} = ₹${(Number(i.price || 0) * Number(i.quantity || 1)).toLocaleString('en-IN')}`).join('\n')}

Subtotal: ₹${subtotal.toLocaleString('en-IN')}
${discountAmount > 0 ? `Discount: -₹${discountAmount.toLocaleString('en-IN')}\n` : ''}Delivery Fee: ₹${deliveryFee.toLocaleString('en-IN')}
Total Amount: ₹${grandTotal.toLocaleString('en-IN')}
Payment Method: ${paymentMethod}

Track online: ${trackOrderUrl}
WhatsApp Support: https://wa.me/919739391891

${storeName} · FSSAI 21226112000732 · MSME UDYAM-KR-19-0005999
  `.trim();

  const subject = `${presentation.badge} Order #${orderId} - ${presentation.label} | ${storeName}`;

  return { html, text, subject };
}

/**
 * Creates a reusable nodemailer transporter from SMTP configuration.
 */
export function createMailTransporter(config: SmtpConfig): Transporter | null {
  const host = config.host;
  const user = config.user;
  const pass = config.pass;
  const port = parseInt(String(config.port || '587'), 10);

  if (!host || !user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
}

/**
 * Sends an automated order status email to the customer using existing SMTP configuration.
 * Includes automatic customer email resolution, idempotent duplicate prevention,
 * and detailed audit trail recording.
 */
export async function sendOrderStatusUpdateEmail(params: StatusEmailParams): Promise<SendStatusEmailResult> {
  const {
    orderId,
    newStatus,
    previousStatus,
    reason,
    trackingCarrier,
    trackingNumber,
    trackingUrl,
    actor = 'admin',
    db,
    auth,
    smtpConfig,
    storeName = 'JIYOO',
    appUrl = process.env.APP_URL || 'https://ais-dev-o4ibuzv4yivkw5mhim6mx6-49339647236.asia-southeast1.run.app',
    force = false,
  } = params;

  if (!orderId) {
    return { success: false, reason: 'ORDER_ID_REQUIRED' };
  }

  // 1. Fetch current order document from Firestore
  let orderData: any = null;
  let orderRef: any = null;

  if (db && typeof db.collection === 'function') {
    try {
      orderRef = db.collection('orders').doc(orderId);
      const snap = await orderRef.get();
      if (snap.exists) {
        orderData = snap.data();
      }
    } catch (err) {
      console.error(`[Order Email Service] Failed to fetch order ${orderId}:`, (err as any)?.message || err);
    }
  }

  if (!orderData) {
    return { success: false, reason: 'ORDER_NOT_FOUND' };
  }

  // 2. Resolve recipient email
  const recipientEmail = await resolveCustomerEmail(orderData, db, auth);

  if (!recipientEmail) {
    console.warn(`[Order Email Service] Order ${orderId} has no associated customer email. Status email not sent.`);
    // Save note in audit log so admins know why no email was sent
    if (db && typeof db.collection === 'function') {
      try {
        await db.collection('audit_logs').add({
          orderId,
          category: 'EMAIL_NOTIFICATIONS',
          action: 'STATUS_EMAIL_SKIPPED_NO_RECIPIENT',
          status: newStatus,
          actor,
          details: `Order status changed to "${newStatus}" but customer email is not available on order or user profile.`,
          createdAt: new Date().toISOString(),
        });
      } catch {
        // non-blocking
      }
    }
    return { success: false, reason: 'NO_CUSTOMER_EMAIL' };
  }

  // 3. Idempotency Check: Did we already send this status email recently?
  const normalizedStatusKey = newStatus.trim().toLowerCase();
  const existingSentRecord = orderData.statusEmailsSent?.[normalizedStatusKey];

  if (!force && existingSentRecord?.sentAt) {
    console.log(`[Order Email Service] Email for status "${newStatus}" already dispatched to ${recipientEmail} for order ${orderId} at ${existingSentRecord.sentAt}. Skipping duplicate.`);
    return { success: true, duplicateSkipped: true, recipient: recipientEmail };
  }

  // 4. Check SMTP configuration
  const transporter = createMailTransporter(smtpConfig);
  if (!transporter) {
    console.warn(
      `[Order Email Service] SMTP is not configured (missing SMTP_HOST, SMTP_USER, or SMTP_PASS). Order status email for order ${orderId} (${newStatus}) was not delivered to ${recipientEmail}.`
    );

    // Record audit entry for admin visibility
    if (db && typeof db.collection === 'function') {
      try {
        await db.collection('audit_logs').add({
          orderId,
          category: 'EMAIL_NOTIFICATIONS',
          action: 'STATUS_EMAIL_SKIPPED_SMTP_UNCONFIGURED',
          status: newStatus,
          recipient: recipientEmail,
          actor,
          details: `Attempted to send status update "${newStatus}" to ${recipientEmail}, but SMTP server credentials are not set in environment.`,
          createdAt: new Date().toISOString(),
        });
      } catch {
        // non-blocking
      }
    }

    return {
      success: false,
      reason: 'SMTP_NOT_CONFIGURED',
      recipient: recipientEmail,
      isMock: true,
    };
  }

  // 5. Construct email HTML, text, and subject
  const { html, text, subject } = buildOrderStatusEmailHtml({
    order: orderData,
    orderId,
    newStatus,
    previousStatus,
    reason,
    trackingCarrier,
    trackingNumber,
    trackingUrl,
    storeName,
    appUrl,
  });

  const safeStoreName = String(storeName).replace(/[\r\n]/g, ' ').slice(0, 100);
  const fromHeader = smtpConfig.from || `"${safeStoreName}" <noreply@example.com>`;

  const mailOptions = {
    from: fromHeader,
    to: recipientEmail,
    subject,
    html,
    text,
    headers: {
      'X-Entity-Ref-ID': orderId,
      'X-JIYOO-Order-Status': newStatus,
    },
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`[Order Email Service] Successfully dispatched order status email: Order #${orderId} -> ${recipientEmail} [Status: ${newStatus}, MessageID: ${info.messageId || 'sent'}]`);

    const nowIso = new Date().toISOString();

    // 6. Persist status email delivery metadata onto the order document in Firestore
    if (orderRef) {
      try {
        await orderRef.update({
          [`statusEmailsSent.${normalizedStatusKey}`]: {
            sentAt: nowIso,
            to: recipientEmail,
            messageId: info.messageId || null,
            status: newStatus,
            actor,
          },
          lastStatusEmailSent: {
            status: newStatus,
            sentAt: nowIso,
            to: recipientEmail,
            messageId: info.messageId || null,
          },
          customerEmail: recipientEmail,
          updatedAt: nowIso,
        });
      } catch (updateErr) {
        console.warn(`[Order Email Service] Could not update order doc with email metadata:`, updateErr);
      }
    }

    // 7. Record in audit logs
    if (db && typeof db.collection === 'function') {
      try {
        await db.collection('audit_logs').add({
          orderId,
          category: 'EMAIL_NOTIFICATIONS',
          action: 'ORDER_STATUS_EMAIL_SENT',
          previousStatus: previousStatus || null,
          newStatus,
          recipient: recipientEmail,
          messageId: info.messageId || null,
          actor,
          details: `Sent order status email "${newStatus}" to customer ${recipientEmail} (MsgID: ${info.messageId || 'ok'}).`,
          createdAt: nowIso,
        });
      } catch {
        // non-blocking
      }
    }

    return {
      success: true,
      messageId: info.messageId,
      recipient: recipientEmail,
    };
  } catch (error: any) {
    console.error(`[Order Email Service] SMTP sendMail failed for order ${orderId} (${recipientEmail}):`, error?.message || error);

    if (db && typeof db.collection === 'function') {
      try {
        await db.collection('audit_logs').add({
          orderId,
          category: 'EMAIL_NOTIFICATIONS',
          action: 'ORDER_STATUS_EMAIL_FAILED',
          status: newStatus,
          recipient: recipientEmail,
          actor,
          error: String(error?.message || error).slice(0, 500),
          details: `Failed to deliver status email "${newStatus}" to ${recipientEmail}: ${error?.message || error}`,
          createdAt: new Date().toISOString(),
        });
      } catch {
        // non-blocking
      }
    }

    return {
      success: false,
      reason: error?.message || 'SMTP_SEND_FAILED',
      recipient: recipientEmail,
    };
  }
}
