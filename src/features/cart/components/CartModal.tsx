import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  X,
  ShoppingBag,
  Trash2,
  Plus,
  Minus,
  ArrowLeft,
  CheckCircle2,
  MapPin,
  Loader2,
  ShieldCheck,
  Truck,
  CreditCard,
  Smartphone,
  AlertTriangle,
} from "lucide-react";
import { useCart } from "../../../contexts/CartContext";
import { useSettings } from "../../../contexts/SettingsContext";
import { useToast } from "../../core/contexts/ToastContext";
import { useModalBackButton } from "../../core/hooks/useModalBackButton";
import { LocationPickerModal } from "../../core/components/LocationPickerModal";
import { PriceDisplay } from "../../core/components/PriceDisplay";
import { sanitizeWhatsAppNumber, createWhatsAppOrderUrl } from "../../../utils/whatsapp";
import { auth } from "../../../services/firebase";
import { getSupabaseAccessToken } from "../../../services/supabase";
import { getStoredCustomerSession } from "../../../utils/customerAuthFallback";
import { saveRecentOrderBookmark } from "../../../utils/orderTracking";
import {
  DEFAULT_RETAIL_AREAS,
  RetailAreaItem,
  normalizeIndianPincode,
} from "../../../constants/deliveryAreas";

const E164_PHONE_REGEX = /^\+?[1-9]\d{6,14}$/;

declare global {
  interface Window {
    Razorpay?: any;
  }
}

function loadRazorpayCheckoutScript(): Promise<boolean> {
  if (typeof window === "undefined") return Promise.resolve(false);
  if (typeof window.Razorpay === "function") return Promise.resolve(true);

  const existing = document.querySelector<HTMLScriptElement>(
    'script[src="https://checkout.razorpay.com/v1/checkout.js"]'
  );
  if (existing) {
    return new Promise((resolve) => {
      if (typeof window.Razorpay === "function") {
        resolve(true);
        return;
      }
      existing.addEventListener("load", () => resolve(typeof window.Razorpay === "function"), {
        once: true,
      });
      existing.addEventListener("error", () => resolve(false), { once: true });
    });
  }

  return new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve(typeof window.Razorpay === "function");
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

function createIdempotencyToken(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `idem_${Date.now()}_${Math.random().toString(36).slice(2, 12)}`;
}

interface CartModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRequireAuth?: () => void;
  initialStep?: "cart" | "checkout";
  initialPaymentMethod?: "razorpay" | "cod" | "whatsapp";
}

function triggerSafeWhatsAppLink(url: string) {
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.target = "_blank";
  anchor.rel = "noopener noreferrer";
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
}

export function CartModal({
  isOpen,
  onClose,
  onRequireAuth,
  initialStep = "cart",
  initialPaymentMethod,
}: CartModalProps) {
  const {
    items,
    cartCount,
    cartTotal,
    removeFromCart,
    updateQuantity,
    clearCart,
    user,
  } = useCart();
  const { settings } = useSettings();
  const { showToast } = useToast();

  const [step, setStep] = useState<"cart" | "checkout" | "success">("cart");
  const [name, setName] = useState(user?.name || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [email, setEmail] = useState(user?.email || "");
  const [houseNo, setHouseNo] = useState("");
  const [street, setStreet] = useState("");
  const [area, setArea] = useState("");
  const [landmark, setLandmark] = useState("");
  const [pincode, setPincode] = useState(user?.pincode || "");
  const [addressType, setAddressType] = useState<"Home" | "Work" | "Other">("Home");
  const [paymentMethod, setPaymentMethod] = useState<"razorpay" | "cod" | "whatsapp">("razorpay");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdOrderId, setCreatedOrderId] = useState<string | null>(null);
  const [lastWhatsAppOrderUrl, setLastWhatsAppOrderUrl] = useState<string | null>(null);
  const [locationPickerOpen, setLocationPickerOpen] = useState(false);

  const [retailAreas, setRetailAreas] = useState<RetailAreaItem[]>(DEFAULT_RETAIL_AREAS);
  const [razorpayStatus, setRazorpayStatus] = useState<{
    checked: boolean;
    configured: boolean;
    gatewayError: string | null;
  }>({ checked: false, configured: false, gatewayError: null });
  const [pincodeCheck, setPincodeCheck] = useState<{
    checking: boolean;
    checkedValue: string;
    serviceable: boolean | null;
    message: string | null;
    overrideFee: number | null;
  }>({ checking: false, checkedValue: "", serviceable: null, message: null, overrideFee: null });

  const isWholesaleItem = (item: { wholesaleEligible?: boolean; wholesaleMinQty?: number }) =>
    item.wholesaleEligible === true || (Number(item.wholesaleMinQty) || 1) > 1;

  const isWholesaleOrder = useMemo(
    () => items.some((i) => isWholesaleItem(i)),
    [items]
  );

  const hasMixedCartTypes = useMemo(() => {
    const hasWholesale = items.some((i) => isWholesaleItem(i));
    const hasRetail = items.some((i) => !isWholesaleItem(i));
    return hasWholesale && hasRetail;
  }, [items]);

  useEffect(() => {
    if (!isOpen) return;
    if (initialPaymentMethod) {
      setPaymentMethod(initialPaymentMethod);
    }
    if (initialStep === "checkout" && items.length > 0) {
      setStep("checkout");
    } else if (initialStep === "checkout" && items.length === 0 && initialPaymentMethod === "whatsapp") {
      const waNum = sanitizeWhatsAppNumber(settings.whatsappNumber);
      const url = `https://wa.me/${waNum}?text=${encodeURIComponent(
        `Hi ${settings.storeName || "JIYOO"}! I would like to place a fresh order.`
      )}`;
      triggerSafeWhatsAppLink(url);
      onClose();
    } else if (step === "success") {
      setStep("cart");
    }
  }, [isOpen, initialStep, initialPaymentMethod]);

  useModalBackButton(isOpen, () => {
    if (step === "checkout") {
      setStep("cart");
    } else {
      onClose();
    }
  });

  useEffect(() => {
    if (user) {
      if (!name && user.name) setName(user.name);
      if (!phone && user.phone) setPhone(user.phone);
      if (!email && user.email) setEmail(user.email);
      if (!pincode && user.pincode) setPincode(user.pincode);
    }
  }, [user, name, phone, email, pincode]);

  // Load live Razorpay config & active delivery areas when modal opens
  useEffect(() => {
    if (!isOpen) return;
    let active = true;

    fetch("/api/razorpay/config")
      .then((r) => r.json())
      .then((data) => {
        if (!active || !data?.success) return;
        setRazorpayStatus((prev) => ({
          ...prev,
          checked: true,
          configured: Boolean(data.configured),
          gatewayError: null,
        }));
      })
      .catch(() => {
        if (!active) return;
        setRazorpayStatus((prev) => ({ ...prev, checked: true }));
      });

    fetch("/api/delivery/active-areas")
      .then((r) => r.json())
      .then((data) => {
        if (!active || !data?.success) return;
        if (Array.isArray(data.retailAreas) && data.retailAreas.length > 0) {
          setRetailAreas(
            data.retailAreas.filter((a: RetailAreaItem) => a && a.enabled !== false)
          );
        }
      })
      .catch(() => {
        // Keep bundled DEFAULT_RETAIL_AREAS fallback
      });

    return () => {
      active = false;
    };
  }, [isOpen]);

  // Live serviceability verification whenever a 6-digit PIN is entered in Checkout
  useEffect(() => {
    if (!isOpen || step !== "checkout") return;
    const cleanPin = normalizeIndianPincode(pincode);
    if (!/^\d{6}$/.test(cleanPin)) {
      setPincodeCheck({
        checking: false,
        checkedValue: "",
        serviceable: null,
        message: null,
        overrideFee: null,
      });
      return;
    }

    let cancelled = false;
    setPincodeCheck((prev) => ({ ...prev, checking: true }));
    const mode = isWholesaleOrder ? "wholesale" : "retail";

    const timer = window.setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/delivery/check-pincode?pincode=${encodeURIComponent(cleanPin)}&mode=${mode}`
        );
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;
        const feeVal =
          mode === "wholesale"
            ? typeof data.shippingFee === "number"
              ? data.shippingFee
              : null
            : typeof data.deliveryFee === "number"
            ? data.deliveryFee
            : null;
        setPincodeCheck({
          checking: false,
          checkedValue: cleanPin,
          serviceable: Boolean(data.serviceable),
          message:
            data.message ||
            (data.serviceable
              ? mode === "wholesale"
                ? `Pan-India Wholesale Shipping (${data.zoneLabel || "Active Zone"})`
                : `Retail delivery available${data.label ? ` • ${data.label}` : ""}`
              : "Sorry, delivery is currently unavailable for this PIN code."),
          overrideFee: feeVal,
        });
      } catch {
        if (!cancelled) {
          setPincodeCheck({
            checking: false,
            checkedValue: cleanPin,
            serviceable: null,
            message: null,
            overrideFee: null,
          });
        }
      }
    }, 220);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [isOpen, step, pincode, isWholesaleOrder]);

  const baseDeliveryFee =
    pincodeCheck.serviceable && pincodeCheck.overrideFee !== null
      ? pincodeCheck.overrideFee
      : Number(settings.deliveryFee ?? 40);

  const deliveryFee =
    isWholesaleOrder
      ? pincodeCheck.serviceable && pincodeCheck.overrideFee !== null
        ? pincodeCheck.overrideFee
        : 0
      : settings.freeDeliveryThreshold > 0 && cartTotal >= settings.freeDeliveryThreshold
      ? 0
      : baseDeliveryFee;

  const grandTotal = Math.max(0, cartTotal + (items.length > 0 ? deliveryFee : 0));

  const requireCheckoutAuth = () => {
    if (hasMixedCartTypes) {
      showToast(
        "Please checkout Retail items (Bengaluru 60-min) and Wholesale Boxes (Pan-India) separately using the buttons above.",
        "error"
      );
      return false;
    }
    // Both guest and signed-in customers can proceed to checkout
    return true;
  };

  const getCheckoutAuthHeaders = async (): Promise<Record<string, string>> => {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    try {
      if (auth.currentUser) {
        const token = await auth.currentUser.getIdToken();
        if (token) headers.Authorization = `Bearer ${token}`;
      } else {
        const supaToken = await getSupabaseAccessToken();
        const custSession = getStoredCustomerSession();
        const fallbackToken = supaToken || custSession?.token;
        if (fallbackToken) headers.Authorization = `Bearer ${fallbackToken}`;
      }
    } catch {
      // Guest checkout allowed
    }
    return headers;
  };

  const persistLocalOrderHistory = (orderId: string, createdOrderRecord: any) => {
    if (!user?.id) return;
    try {
      const cacheKey = `jiyoo_orders_history_v2:${user.id}`;
      const existingLocal = JSON.parse(localStorage.getItem(cacheKey) || "[]");
      const deduped = Array.isArray(existingLocal)
        ? existingLocal.filter((o: any) => String(o?.id || o?.orderId) !== String(orderId))
        : [];
      localStorage.setItem(cacheKey, JSON.stringify([createdOrderRecord, ...deduped].slice(0, 50)));
    } catch {
      // ignore local cache quota errors
    }
  };

  const cancelRazorpayReservation = async (
    razorpayOrderId: string,
    guestVerifyToken: string | undefined,
    reason: string
  ) => {
    try {
      const headers = await getCheckoutAuthHeaders();
      await fetch("/api/razorpay/cancel", {
        method: "POST",
        headers,
        body: JSON.stringify({
          razorpay_order_id: razorpayOrderId,
          guest_verify_token: guestVerifyToken,
          reason,
        }),
      });
    } catch {
      // Reservation auto-expires on server if offline
    }
  };

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requireCheckoutAuth()) return;

    const cleanPhone = phone.replace(/[\s()-]/g, "");
    if (!E164_PHONE_REGEX.test(cleanPhone)) {
      showToast("Valid 10-digit or international phone number required.", "error");
      return;
    }

    const cleanPin = normalizeIndianPincode(pincode);
    if (!name.trim() || !houseNo.trim() || !area.trim() || !cleanPin) {
      showToast("Please complete your delivery address details.", "error");
      return;
    }

    if (pincodeCheck.serviceable === false) {
      showToast(
        pincodeCheck.message || "Delivery is currently unavailable for the entered PIN code.",
        "error"
      );
      return;
    }

    const fullAddress = [
      `[${addressType}]`,
      houseNo.trim(),
      street.trim(),
      area.trim(),
      landmark.trim() ? `Landmark: ${landmark.trim()}` : "",
      `PIN: ${cleanPin}`,
    ]
      .filter(Boolean)
      .join(", ");

    const resolvedOrderType = isWholesaleOrder ? "wholesale" : "retail";
    const serializedItems = items.map((item) => ({
      id: item.id,
      baseId: item.baseId ?? item.id,
      name: item.name,
      quantity: item.quantity,
      price: item.numericPrice,
      image: item.image,
      selectedWeight: item.selectedWeight || item.badge || item.unit,
      selectedCut: item.selectedCut,
      selectedCleaning: item.selectedCleaning,
    }));

    const shippingPayload = {
      name: name.trim(),
      phone: cleanPhone,
      ...(email.trim() ? { email: email.trim() } : {}),
      address: fullAddress,
      pincode: cleanPin,
      houseNo: houseNo.trim(),
      street: street.trim(),
      area: area.trim(),
      landmark: landmark.trim(),
      addressType,
    };

    setRazorpayStatus((prev) => ({ ...prev, gatewayError: null }));
    setIsSubmitting(true);

    try {
      const headers = await getCheckoutAuthHeaders();

      // GENUINE REAL-TIME RAZORPAY PAYMENT FLOW (NO SIMULATED PAYMENTS)
      if (paymentMethod === "razorpay") {
        const orderRes = await fetch("/api/razorpay/order", {
          method: "POST",
          headers: {
            ...headers,
            "Idempotency-Key": createIdempotencyToken(),
          },
          body: JSON.stringify({
            items: serializedItems,
            orderType: resolvedOrderType,
            customerEmail: email.trim() || undefined,
            shippingDetails: shippingPayload,
          }),
        });

        const orderData = await orderRes.json().catch(() => ({}));
        if (!orderRes.ok || !orderData?.success || !orderData?.order?.id || !orderData?.key_id) {
          const msg =
            orderData?.error ||
            "Online payment gateway could not be initialized. Please try Cash / UPI on Delivery or WhatsApp Express.";
          if (orderData?.gatewayUnavailable || orderRes.status === 503) {
            setRazorpayStatus((prev) => ({ ...prev, configured: false, gatewayError: msg }));
          }
          showToast(msg, "error");
          setIsSubmitting(false);
          return;
        }

        const scriptLoaded = await loadRazorpayCheckoutScript();
        if (!scriptLoaded || typeof window.Razorpay !== "function") {
          await cancelRazorpayReservation(
            orderData.order.id,
            orderData.guest_verify_token,
            "razorpay_sdk_failed_to_load"
          );
          showToast(
            "Unable to load Razorpay secure checkout script. Please check your connection or use Doorstep Cash / UPI.",
            "error"
          );
          setIsSubmitting(false);
          return;
        }

        const guestVerifyToken: string | undefined = orderData.guest_verify_token;

        const rzp = new window.Razorpay({
          key: orderData.key_id,
          amount: orderData.order.amount,
          currency: orderData.order.currency || "INR",
          name: settings.storeName || "JIYOO Premium Products",
          description: `Order Payment (${items.length} item${items.length === 1 ? "" : "s"})`,
          order_id: orderData.order.id,
          prefill: {
            name: name.trim(),
            contact: cleanPhone,
            ...(email.trim() ? { email: email.trim() } : {}),
          },
          notes: {
            orderType: resolvedOrderType,
            pincode: cleanPin,
          },
          theme: {
            color: "#047857",
          },
          modal: {
            ondismiss: async () => {
              await cancelRazorpayReservation(
                orderData.order.id,
                guestVerifyToken,
                "checkout_modal_dismissed"
              );
              setIsSubmitting(false);
              showToast(
                "Payment window closed before completion. Reserved stock has been released.",
                "info"
              );
            },
          },
          handler: async (rzpResponse: {
            razorpay_order_id: string;
            razorpay_payment_id: string;
            razorpay_signature: string;
          }) => {
            try {
              const verifyHeaders = await getCheckoutAuthHeaders();
              const verifyRes = await fetch("/api/razorpay/verify", {
                method: "POST",
                headers: verifyHeaders,
                body: JSON.stringify({
                  razorpay_order_id: rzpResponse.razorpay_order_id,
                  razorpay_payment_id: rzpResponse.razorpay_payment_id,
                  razorpay_signature: rzpResponse.razorpay_signature,
                  ...(guestVerifyToken ? { guest_verify_token: guestVerifyToken } : {}),
                  items: serializedItems,
                  orderType: resolvedOrderType,
                  customerEmail: email.trim() || undefined,
                  shippingDetails: shippingPayload,
                }),
              });

              const verifyData = await verifyRes.json().catch(() => ({}));
              if (!verifyRes.ok || !verifyData?.success) {
                showToast(
                  verifyData?.error ||
                    "Payment could not be verified. If money was debited, contact support with your payment ID.",
                  "error"
                );
                setIsSubmitting(false);
                return;
              }

              const verifiedOrderId = verifyData.orderId || rzpResponse.razorpay_order_id;
              setCreatedOrderId(verifiedOrderId);
              saveRecentOrderBookmark(verifiedOrderId);
              setLastWhatsAppOrderUrl(null);

              persistLocalOrderHistory(
                verifiedOrderId,
                verifyData.order || {
                  id: verifiedOrderId,
                  orderId: verifiedOrderId,
                  userId: user?.id,
                  items: serializedItems.map((it) => ({ ...it, numericPrice: it.price })),
                  subtotal: cartTotal,
                  deliveryFee,
                  grandTotal,
                  amount: grandTotal,
                  paymentMethod: "Online Payment (Razorpay)",
                  paymentStatus: "paid",
                  razorpay_order_id: rzpResponse.razorpay_order_id,
                  razorpay_payment_id: rzpResponse.razorpay_payment_id,
                  orderStatus: "confirmed",
                  status: "confirmed",
                  orderType: resolvedOrderType,
                  shippingDetails: {
                    name: name.trim(),
                    phone: cleanPhone,
                    address: fullAddress,
                    pincode: cleanPin,
                  },
                  createdAt: new Date().toISOString(),
                }
              );

              clearCart();
              setStep("success");
              showToast("Payment verified & order confirmed!", "success");
            } catch (verifyErr: any) {
              showToast(
                verifyErr?.message || "Payment verification failed. Please check My Orders.",
                "error"
              );
            } finally {
              setIsSubmitting(false);
            }
          },
        });

        if (typeof rzp.on === "function") {
          rzp.on("payment.failed", async (failEvent: any) => {
            await cancelRazorpayReservation(
              orderData.order.id,
              guestVerifyToken,
              failEvent?.error?.reason || "razorpay_payment_failed"
            );
            setIsSubmitting(false);
            showToast(
              failEvent?.error?.description || "Payment failed. No amount was captured.",
              "error"
            );
          });
        }

        rzp.open();
        return;
      }

      // DOORSTEP CASH / UPI OR WHATSAPP EXPRESS FLOW
      const endpoint =
        paymentMethod === "whatsapp" ? "/api/whatsapp/prepare-order" : "/api/orders/create";
      const serverPaymentMethod =
        paymentMethod === "whatsapp" ? "WhatsApp Express" : "Cash on Delivery";

      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          ...headers,
          "Idempotency-Key": createIdempotencyToken(),
        },
        body: JSON.stringify({
          items: serializedItems,
          orderType: resolvedOrderType,
          customerEmail: email.trim() || undefined,
          shippingDetails: shippingPayload,
          paymentMethod: serverPaymentMethod,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        showToast(data.error || "Could not place order. Please check your details.", "error");
        setIsSubmitting(false);
        return;
      }

      const orderId = data.orderId || data.id || "JIYOO-ORD";
      const verifiedSubtotal = typeof data.subtotal === "number" ? data.subtotal : cartTotal;
      const verifiedDeliveryFee =
        typeof data.deliveryFee === "number" ? data.deliveryFee : deliveryFee;
      const verifiedGrandTotal =
        typeof data.grandTotal === "number" ? data.grandTotal : grandTotal;
      const verificationCode =
        typeof data.verificationCode === "string" ? data.verificationCode : undefined;

      setCreatedOrderId(orderId);
      saveRecentOrderBookmark(orderId);

      persistLocalOrderHistory(
        orderId,
        data.order || {
          id: orderId,
          orderId,
          userId: user?.id,
          items: serializedItems.map((it) => ({ ...it, numericPrice: it.price })),
          subtotal: verifiedSubtotal,
          deliveryFee: verifiedDeliveryFee,
          grandTotal: verifiedGrandTotal,
          amount: verifiedGrandTotal,
          paymentMethod: serverPaymentMethod,
          paymentStatus: "unpaid",
          ...(verificationCode ? { verificationCode } : {}),
          orderStatus:
            paymentMethod === "whatsapp" ? "AWAITING_WHATSAPP_CONFIRMATION" : "pending",
          status:
            paymentMethod === "whatsapp" ? "AWAITING_WHATSAPP_CONFIRMATION" : "pending",
          orderType: resolvedOrderType,
          shippingDetails: {
            name: name.trim(),
            phone: cleanPhone,
            address: fullAddress,
            pincode: cleanPin,
          },
          createdAt: new Date().toISOString(),
        }
      );

      if (paymentMethod === "whatsapp") {
        const waUrl = createWhatsAppOrderUrl({
          orderId,
          verificationCode,
          orderType: resolvedOrderType,
          items: items.map((i) => ({
            name: i.name,
            quantity: i.quantity,
            price: i.numericPrice,
            numericPrice: i.numericPrice,
            selectedWeight: i.selectedWeight || i.badge || i.unit,
            selectedCut: i.selectedCut,
          })),
          totalAmount: verifiedGrandTotal,
          subtotal: verifiedSubtotal,
          discountAmount: typeof data.discountAmount === "number" ? data.discountAmount : undefined,
          deliveryFee: verifiedDeliveryFee,
          customerName: name.trim(),
          customerPhone: cleanPhone,
          customerHouseNo: houseNo.trim(),
          customerStreet: street.trim(),
          customerAddress: fullAddress,
          ...(resolvedOrderType === "retail"
            ? { customerCity: "Bangalore", customerState: "Karnataka" }
            : {}),
          customerPincode: cleanPin,
          customerLandmark: landmark.trim() || undefined,
          customerAddressType: addressType,
          selectedArea:
            area.trim() || (resolvedOrderType === "wholesale" ? "Pan-India B2B" : undefined),
          priceVerified: Boolean(data.priceVerified),
          paymentMethod: "WhatsApp Express",
          whatsappNumber: settings.whatsappNumber,
        });
        setLastWhatsAppOrderUrl(waUrl);
        triggerSafeWhatsAppLink(waUrl);
      } else {
        setLastWhatsAppOrderUrl(null);
      }

      clearCart();
      setStep("success");
      showToast("Order placed successfully!", "success");
      setIsSubmitting(false);
    } catch (err: any) {
      showToast(err?.message || "Order submission failed.", "error");
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex justify-end">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-brand-black/60 backdrop-blur-xs"
          />

          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 280 }}
            className="relative w-full max-w-md bg-[#FAF9F5] h-full flex flex-col shadow-2xl z-10"
          >
            {/* Header */}
            <div className="p-5 bg-white border-b border-[#E7E3DA] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                {step === "checkout" && (
                  <button
                    type="button"
                    onClick={() => setStep("cart")}
                    className="p-1.5 rounded-lg hover:bg-brand-gray-100 text-brand-black"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                )}
                <ShoppingBag className="w-5 h-5 text-emerald-700" />
                <h2 className="text-lg font-serif font-bold text-brand-black">
                  {step === "cart"
                    ? `Your Basket (${cartCount})`
                    : step === "checkout"
                    ? "Express Checkout"
                    : "Order Confirmed"}
                </h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-full hover:bg-brand-gray-100 text-brand-gray-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {step === "cart" && (
                <>
                  {items.length === 0 ? (
                    <div className="py-20 text-center space-y-3">
                      <ShoppingBag className="w-12 h-12 mx-auto text-brand-gray-300" />
                      <p className="font-serif text-xl font-bold text-brand-black">
                        Your basket is empty
                      </p>
                      <p className="text-sm text-brand-gray-500 max-w-xs mx-auto">
                        Add fresh imported fruits, daily vegetables, or custom-cut meats to begin.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {hasMixedCartTypes && (
                        <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 space-y-2 text-xs text-amber-950">
                          <div className="flex items-start gap-2">
                            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                            <div>
                              <p className="font-bold">Separate Checkout Required for Retail &amp; Wholesale</p>
                              <p className="text-[11px] text-amber-800 mt-0.5 leading-relaxed">
                                Wholesale boxes ship Pan-India in master cartons while Retail items deliver in 60 mins within Bengaluru. Choose which basket to checkout first:
                              </p>
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-2 pl-6">
                            <button
                              type="button"
                              onClick={() => items.filter((i) => isWholesaleItem(i)).forEach((i) => removeFromCart(i.id))}
                              className="px-2.5 py-1.5 rounded-lg bg-white border border-amber-300 text-[11px] font-semibold text-amber-950 hover:bg-amber-100 cursor-pointer"
                            >
                              Keep Retail Only
                            </button>
                            <button
                              type="button"
                              onClick={() => items.filter((i) => !isWholesaleItem(i)).forEach((i) => removeFromCart(i.id))}
                              className="px-2.5 py-1.5 rounded-lg bg-amber-900 text-white text-[11px] font-semibold hover:bg-amber-800 cursor-pointer"
                            >
                              Keep Wholesale Boxes Only
                            </button>
                          </div>
                        </div>
                      )}
                      {items.map((item) => (
                        <div
                          key={item.id}
                          className="bg-white p-3.5 rounded-xl border border-[#E7E3DA] flex items-center gap-3"
                        >
                          <img
                            src={item.image}
                            alt={item.name}
                            className="w-16 h-16 rounded-lg object-contain bg-[#FAF9F5] p-1 shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-sm text-brand-black truncate">
                              {item.name}
                            </h4>
                            {(item.selectedWeight || item.badge || item.unit) && (
                              <p className="text-xs text-brand-gray-500">
                                {item.selectedWeight || item.badge || item.unit}
                              </p>
                            )}
                            <div className="mt-1">
                              <PriceDisplay
                                amount={item.numericPrice * item.quantity}
                                size="sm"
                              />
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 bg-[#FAF9F5] border border-[#E7E3DA] rounded-lg px-2 py-1">
                            <button
                              type="button"
                              aria-label={`Decrease ${item.name} quantity`}
                              onClick={() => {
                                const minQty = (item as any).wholesaleMinQty || 1;
                                if (item.quantity <= minQty) {
                                  removeFromCart(item.id);
                                } else {
                                  updateQuantity(item.id, item.quantity - 1);
                                }
                              }}
                              className="p-1 text-brand-black hover:text-emerald-700 cursor-pointer"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <span className="text-xs font-bold w-5 text-center tabular-nums">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              aria-label={`Increase ${item.name} quantity`}
                              onClick={() => updateQuantity(item.id, item.quantity + 1)}
                              className="p-1 text-brand-black hover:text-emerald-700 cursor-pointer"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeFromCart(item.id)}
                            className="p-1.5 text-brand-gray-400 hover:text-red-600"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}

              {step === "checkout" && (
                <form id="jiyoo-checkout-form" onSubmit={handlePlaceOrder} className="space-y-4">
                  {!user && onRequireAuth && (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center justify-between text-xs text-emerald-900">
                      <span>Have an account? Sign in for faster checkout.</span>
                      <button
                        type="button"
                        onClick={onRequireAuth}
                        className="font-bold underline"
                      >
                        Sign In
                      </button>
                    </div>
                  )}

                  <div className="bg-white p-4 rounded-xl border border-[#E7E3DA] space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-brand-black">Delivery Details</h3>
                      <button
                        type="button"
                        onClick={() => setLocationPickerOpen(true)}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:underline cursor-pointer"
                      >
                        <MapPin className="w-3.5 h-3.5" />
                        Select Map / ZIP Area
                      </button>
                    </div>

                    {/* Restored Bengaluru Retail Delivery Area & PIN Quick-Select */}
                    {isWholesaleOrder ? (
                      <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-900 flex items-start gap-2">
                        <Truck className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-bold">Pan-India Wholesale Delivery Active</p>
                          <p className="text-amber-800/90">
                            Enter any valid 6-digit Indian PIN code below for B2B carton shipping.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="p-3 rounded-xl bg-[#FAF9F5] border border-[#E7E3DA] space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-stone-700 flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-emerald-700" />
                            Retail Delivery Areas &amp; PIN Codes
                          </span>
                          <span className="text-[10px] font-mono text-stone-500">
                            Bengaluru (5 PINs)
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {retailAreas.map((item) => {
                            const isSelected =
                              normalizeIndianPincode(pincode) === item.pincode &&
                              area.toLowerCase().includes(item.areaName.toLowerCase());
                            return (
                              <button
                                key={item.id}
                                type="button"
                                onClick={() => {
                                  setArea(item.areaName);
                                  setPincode(item.pincode);
                                }}
                                className={`px-2 py-1 rounded-lg text-[11px] font-medium border transition-colors cursor-pointer ${
                                  isSelected
                                    ? "bg-emerald-700 text-white border-emerald-700"
                                    : "bg-white hover:bg-emerald-50 text-stone-800 border-[#E7E3DA]"
                                }`}
                              >
                                {item.areaName} ·{" "}
                                <span className="font-mono">{item.displayPincode}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Full Name *"
                      className="w-full px-3.5 py-2.5 text-sm border border-[#E7E3DA] rounded-xl bg-[#FAF9F5]"
                    />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <input
                        type="tel"
                        required
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="Mobile Number (e.g. +919876543210) *"
                        className="w-full px-3.5 py-2.5 text-sm border border-[#E7E3DA] rounded-xl bg-[#FAF9F5]"
                      />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Email for Order Receipt (Optional)"
                        className="w-full px-3.5 py-2.5 text-sm border border-[#E7E3DA] rounded-xl bg-[#FAF9F5]"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2.5">
                      <input
                        type="text"
                        required
                        value={houseNo}
                        onChange={(e) => setHouseNo(e.target.value)}
                        placeholder="House / Flat No. *"
                        className="w-full px-3.5 py-2 text-sm border border-[#E7E3DA] rounded-xl bg-[#FAF9F5]"
                      />
                      <input
                        type="text"
                        value={street}
                        onChange={(e) => setStreet(e.target.value)}
                        placeholder="Street / Road"
                        className="w-full px-3.5 py-2 text-sm border border-[#E7E3DA] rounded-xl bg-[#FAF9F5]"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2.5">
                      <input
                        type="text"
                        required
                        value={area}
                        onChange={(e) => setArea(e.target.value)}
                        placeholder="Area / Locality *"
                        className="w-full px-3.5 py-2 text-sm border border-[#E7E3DA] rounded-xl bg-[#FAF9F5]"
                      />
                      <input
                        type="text"
                        required
                        maxLength={10}
                        value={pincode}
                        onChange={(e) => setPincode(e.target.value)}
                        placeholder="PIN / ZIP Code *"
                        className="w-full px-3.5 py-2 text-sm font-mono border border-[#E7E3DA] rounded-xl bg-[#FAF9F5]"
                      />
                    </div>

                    {/* Live PIN Code Serviceability Feedback */}
                    {pincodeCheck.checking && (
                      <p className="text-[11px] text-stone-500 flex items-center gap-1.5">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Checking delivery availability for {normalizeIndianPincode(pincode)}...
                      </p>
                    )}
                    {!pincodeCheck.checking && pincodeCheck.serviceable === true && (
                      <p className="text-[11px] text-emerald-700 font-medium bg-emerald-50 border border-emerald-200 rounded-lg px-2.5 py-1.5">
                        ✓ {pincodeCheck.message}
                      </p>
                    )}
                    {!pincodeCheck.checking && pincodeCheck.serviceable === false && (
                      <p className="text-[11px] text-red-700 font-medium bg-red-50 border border-red-200 rounded-lg px-2.5 py-1.5">
                        ✕ {pincodeCheck.message}
                      </p>
                    )}

                    <input
                      type="text"
                      value={landmark}
                      onChange={(e) => setLandmark(e.target.value)}
                      placeholder="Nearby Landmark (Optional)"
                      className="w-full px-3.5 py-2 text-sm border border-[#E7E3DA] rounded-xl bg-[#FAF9F5]"
                    />

                    <div className="flex items-center gap-2 pt-1">
                      {(["Home", "Work", "Other"] as const).map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setAddressType(t)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                            addressType === t
                              ? "bg-brand-black text-white border-brand-black"
                              : "bg-[#FAF9F5] text-brand-gray-600 border-[#E7E3DA]"
                          }`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Payment Options — Genuine Razorpay + Doorstep COD/UPI + WhatsApp */}
                  <div className="bg-white p-4 rounded-xl border border-[#E7E3DA] space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-brand-black">Payment Method</h3>
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-emerald-700">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        256-Bit Encrypted
                      </span>
                    </div>

                    <div className="space-y-2">
                      <button
                        type="button"
                        onClick={() => setPaymentMethod("razorpay")}
                        className={`w-full text-left p-3 rounded-xl border transition-colors cursor-pointer flex items-start justify-between gap-2 ${
                          paymentMethod === "razorpay"
                            ? "bg-emerald-700 text-white border-emerald-700"
                            : "bg-[#FAF9F5] text-brand-black border-[#E7E3DA] hover:bg-stone-100"
                        }`}
                      >
                        <div className="space-y-0.5">
                          <div className="text-xs font-bold flex items-center gap-1.5">
                            <CreditCard className="w-3.5 h-3.5 shrink-0" />
                            <span>Pay Online via Razorpay Gateway</span>
                          </div>
                          <p
                            className={`text-[11px] ${
                              paymentMethod === "razorpay" ? "text-emerald-50" : "text-stone-500"
                            }`}
                          >
                            Cards, Any UPI App (GPay, PhonePe, Paytm, BHIM), Netbanking &amp; Wallets
                          </p>
                        </div>
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-md shrink-0 inline-flex items-center gap-1 ${
                            paymentMethod === "razorpay"
                              ? "bg-white/20 text-white"
                              : "bg-emerald-100 text-emerald-800"
                          }`}
                        >
                          <ShieldCheck className="w-3 h-3" />
                          <span>Verified</span>
                        </span>
                      </button>

                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setPaymentMethod("cod")}
                          className={`py-2.5 px-3 rounded-xl text-xs font-semibold border transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
                            paymentMethod === "cod"
                              ? "bg-emerald-700 text-white border-emerald-700"
                              : "bg-[#FAF9F5] text-brand-black border-[#E7E3DA] hover:bg-stone-100"
                          }`}
                        >
                          <Truck className="w-3.5 h-3.5 shrink-0" />
                          <span>Cash / UPI at Doorstep</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setPaymentMethod("whatsapp")}
                          className={`py-2.5 px-3 rounded-xl text-xs font-semibold border transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
                            paymentMethod === "whatsapp"
                              ? "bg-emerald-700 text-white border-emerald-700"
                              : "bg-[#FAF9F5] text-brand-black border-[#E7E3DA] hover:bg-stone-100"
                          }`}
                        >
                          <Smartphone className="w-3.5 h-3.5 shrink-0" />
                          <span>WhatsApp Order</span>
                        </button>
                      </div>
                    </div>

                    {paymentMethod === "razorpay" && razorpayStatus.gatewayError && (
                      <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                        <p className="text-[11px] leading-relaxed text-amber-900 font-medium">
                          {razorpayStatus.gatewayError}
                        </p>
                      </div>
                    )}

                    <p className="text-xs text-brand-gray-600 leading-relaxed bg-[#FAF9F5] p-3 rounded-xl border border-[#E7E3DA]">
                      {paymentMethod === "razorpay"
                        ? "Processed directly through Razorpay's PCI-DSS certified checkout with real-time signature & server payment capture verification."
                        : paymentMethod === "whatsapp"
                        ? "Confirm your basket via WhatsApp directly with our team. Pay via Cash or verified doorstep collection on delivery."
                        : "Pay via Cash or on-spot collection at your doorstep upon delivery. Live order tracking begins immediately."}
                    </p>
                  </div>
                </form>
              )}

              {step === "success" && (
                <div className="py-12 text-center space-y-4">
                  <CheckCircle2 className="w-16 h-16 text-emerald-600 mx-auto" />
                  <h3 className="text-2xl font-serif font-bold text-brand-black">
                    Thank You for Your Order!
                  </h3>
                  <p className="text-sm text-brand-gray-600">
                    Order Reference Created:{" "}
                    <span className="font-mono font-bold text-brand-black">
                      #{createdOrderId}
                    </span>
                  </p>
                  <div className="flex flex-col items-center gap-2.5 pt-2">
                    {createdOrderId && (
                      <button
                        type="button"
                        onClick={() => {
                          const targetId = createdOrderId;
                          const targetPhone = phone.replace(/[\s()-]/g, "");
                          setStep("cart");
                          onClose();
                          document.dispatchEvent(
                            new CustomEvent("open-track-order", {
                              detail: { orderId: targetId, phone: targetPhone },
                            })
                          );
                        }}
                        className="w-full max-w-xs py-2.5 px-6 rounded-xl bg-white hover:bg-stone-50 text-brand-black border border-[#DCD6CA] text-sm font-semibold transition-colors inline-flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <Truck className="w-4 h-4 text-emerald-700" />
                        <span>Track Order Status</span>
                      </button>
                    )}
                    {lastWhatsAppOrderUrl && (
                      <a
                        href={lastWhatsAppOrderUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full max-w-xs py-3 px-6 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-semibold transition-colors cursor-pointer"
                      >
                        Open WhatsApp to Send Order
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setStep("cart");
                        onClose();
                      }}
                      className="w-full max-w-xs py-2.5 px-6 rounded-xl bg-brand-black text-white text-sm font-semibold cursor-pointer"
                    >
                      Continue Shopping
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            {items.length > 0 && step !== "success" && (
              <div className="p-5 bg-white border-t border-[#E7E3DA] space-y-3">
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between text-brand-gray-600">
                    <span>Subtotal</span>
                    <span>₹{cartTotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-brand-gray-600">
                    <span>Delivery Fee</span>
                    <span>{deliveryFee === 0 ? "FREE" : `₹${deliveryFee}`}</span>
                  </div>
                  <div className="flex justify-between font-bold text-base text-brand-black pt-1 border-t border-[#E7E3DA]">
                    <span>Grand Total</span>
                    <span>₹{grandTotal.toLocaleString()}</span>
                  </div>
                </div>

                {step === "cart" ? (
                  <button
                    type="button"
                    onClick={() => { if (requireCheckoutAuth()) setStep("checkout"); }}
                    className="w-full py-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-sm transition-colors cursor-pointer"
                  >
                    Proceed to Checkout • ₹{grandTotal.toLocaleString()}
                  </button>
                ) : (
                  <button
                    type="submit"
                    form="jiyoo-checkout-form"
                    disabled={isSubmitting}
                    className="w-full py-3 rounded-xl bg-brand-black hover:bg-brand-gray-900 text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        {paymentMethod === "razorpay"
                          ? "Connecting Razorpay..."
                          : "Processing Order..."}
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4" />
                        {paymentMethod === "razorpay"
                          ? `Pay ₹${grandTotal.toLocaleString()} with Razorpay`
                          : `Confirm Order • ₹${grandTotal.toLocaleString()}`}
                      </>
                    )}
                  </button>
                )}
              </div>
            )}
          </motion.div>

          <LocationPickerModal
            isOpen={locationPickerOpen}
            onClose={() => setLocationPickerOpen(false)}
            onSelectLocation={(loc) => {
              if (loc.address) setArea(loc.address);
              if (loc.pincode) setPincode(loc.pincode);
              setLocationPickerOpen(false);
            }}
          />
        </div>
      )}
    </AnimatePresence>
  );
}
