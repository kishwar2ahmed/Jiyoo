import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useCart } from "../../../contexts/CartContext";
import {
  X,
  Minus,
  Plus,
  ShoppingBag,
  ArrowRight,
  CreditCard,
  Check,
  MapPin,
  ShieldCheck,
  ChevronLeft,
  MessageCircle,
  Navigation,
  Bookmark,
  Zap,
} from "lucide-react";
import { db } from "../../../services/firebase";
import {
  collection,
  addDoc,
  serverTimestamp,
  getDocs,
  query,
  where,
  limit,
} from "firebase/firestore";
import { createWhatsAppOrderUrl } from "../../../utils/whatsapp";
import { useSettings } from "../../../contexts/SettingsContext";
import { LocationPickerModal } from "../../core/components/LocationPickerModal";
import { getOptimizedImageUrl } from "../../../utils/imageUtils";
import { useToast } from "../../core/contexts/ToastContext";
import { useModalBackButton } from "../../core/hooks/useModalBackButton";

import { getAuth } from "firebase/auth";

// Trust & Payment Method Logos
const PaytmLogo = ({ className = "" }: { className?: string }) => (
  <span
    className={`inline-flex items-center gap-1 bg-[#002e6e] text-white px-2 py-0.5 rounded-md font-black text-[10px] tracking-tight border border-[#001f4c] shadow-2xs ${className}`}
  >
    <span>Pay</span>
    <span className="text-[#00baf2]">tm</span>
  </span>
);

const UpiLogo = ({ className = "" }: { className?: string }) => (
  <span
    className={`inline-flex items-center gap-1 bg-white border border-gray-300 px-1.5 py-0.5 rounded-md shadow-2xs ${className}`}
  >
    <svg className="w-3.5 h-3" viewBox="0 0 32 32" fill="none">
      <path d="M18 4L8 28h5l10-24h-5z" fill="#007934" />
      <path d="M12 4L2 28h5l10-24h-5z" fill="#ED7223" />
      <path d="M24 4L14 28h5l10-24h-5z" fill="#007934" />
    </svg>
    <span className="font-extrabold text-[10px] text-gray-900 tracking-wider">
      UPI
    </span>
  </span>
);

const PhonePeBadge = ({ className = "" }: { className?: string }) => (
  <span
    className={`inline-flex items-center gap-1 bg-[#5f259f] text-white px-1.5 py-0.5 rounded-md font-bold text-[10px] shadow-2xs ${className}`}
  >
    <span className="w-2.5 h-2.5 rounded-full bg-white text-[#5f259f] flex items-center justify-center text-[7px] font-black">
      पे
    </span>
    <span>PhonePe</span>
  </span>
);

const GPayBadge = ({ className = "" }: { className?: string }) => (
  <span
    className={`inline-flex items-center gap-0.5 bg-white border border-gray-300 px-1.5 py-0.5 rounded-md font-extrabold text-[10px] shadow-2xs ${className}`}
  >
    <span className="text-[#4285F4]">G</span>
    <span className="text-[#EA4335]">P</span>
    <span className="text-[#FBBC05]">a</span>
    <span className="text-[#34A853]">y</span>
  </span>
);

const getValidPrice = (item: any) => {
  const p1 = Number(item.numericPrice);
  if (!isNaN(p1) && p1 > 0) return p1;
  const p2 = parseFloat(String(item.price).replace(/[^0-9.]/g, ""));
  return isNaN(p2) ? 0 : p2;
};
export function CartModal({
  isOpen,
  onClose,
  onRequestAuth,
}: {
  isOpen: boolean;
  onClose: () => void;
  onRequestAuth?: () => void;
}) {
  const {
    items,
    removeFromCart,
    updateQuantity,
    cartTotal,
    cartCount,
    clearCart,
    syncCartPrices,
    user,
  } = useCart();
  const { settings } = useSettings();
  const { showToast } = useToast();
  const deliveryFeeSetting =
    typeof settings.deliveryFee === "number" ? settings.deliveryFee : 40;
  const isFreeDelivery =
    settings.freeDeliveryThreshold &&
    settings.freeDeliveryThreshold > 0 &&
    cartTotal >= settings.freeDeliveryThreshold;
  const [promoCode, setPromoCode] = useState("");
  const [showPriceBreakdown, setShowPriceBreakdown] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string;
    discountAmount: number;
    description?: string;
  } | null>(null);
  const [promoError, setPromoError] = useState("");
  const [isValidatingPromo, setIsValidatingPromo] = useState(false);

  const effectiveDeliveryFee =
    items.length > 0 ? (isFreeDelivery ? 0 : deliveryFeeSetting) : 0;
  // Discount comes from the last server-validated coupon check (handleApplyPromo).
  const discountAmount = appliedCoupon?.discountAmount || 0;
  const isPromoApplied = !!appliedCoupon;
  const finalCartTotal = Math.max(0, cartTotal - discountAmount);
  const grandTotal = items.length > 0 ? finalCartTotal + effectiveDeliveryFee : 0;

  const [step, setStep] = useState<"cart" | "checkout" | "success" | "upi_qr" | "whatsapp_success" | "whatsapp_confirm">(
    "cart",
  );
  const [isProcessing, setIsProcessing] = useState(false);
  const checkoutIdempotencyKeyRef = useRef<string | null>(null);
  const getCheckoutIdempotencyKey = () => {
    if (!checkoutIdempotencyKeyRef.current) {
      checkoutIdempotencyKeyRef.current = typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `jiyoo-${Date.now()}-${Math.random().toString(36).slice(2, 18)}`;
    }
    return checkoutIdempotencyKeyRef.current;
  };
  const resetCheckoutIdempotencyKey = () => { checkoutIdempotencyKeyRef.current = null; };
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);

  // Let the device/browser back button close this modal one step at a time
  // instead of navigating away from the site.
  useModalBackButton(isOpen, onClose);
  const [generatedWhatsAppUrl, setGeneratedWhatsAppUrl] = useState<string | null>(null);
  const [pendingOrderId, setPendingOrderId] = useState<string | null>(null);
  const [mapModalInitialTab, setMapModalInitialTab] = useState<"map" | "saved">(
    "map",
  );
  const [savedAddressesList, setSavedAddressesList] = useState<
    Array<{ id?: string; name: string; address: string; pincode: string }>
  >([]);
  
  const sendEmailNotification = async (orderId: string, orderData: any) => {
    if (!user?.email) return;
    try {
      const token = await getAuth().currentUser?.getIdToken();
      await fetch("/api/send-order-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({
          email: user.email,
          order: { ...orderData, id: orderId },
        }),
      });
    } catch (e) {
      console.error("Failed to send email notification:", e);
    }
  };

  const [paymentMethod, setPaymentMethod] = useState<
    "razorpay" | "upi_qr" | "cod"
  >("razorpay");

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [pincode, setPincode] = useState("");
  const [formErrors, setFormErrors] = useState<{
    name?: string;
    phone?: string;
    address?: string;
    pincode?: string;
  }>({});

  useEffect(() => {
    if (user) {
      setName(user.name || user.displayName || "");
    }
  }, [user]);

  // Reset state when opened/closed
  useEffect(() => {
    if (!isOpen) {
      setTimeout(() => setStep("cart"), 300);
    } else {
      syncCartPrices();
    }
  }, [isOpen]);

  const handleCurrentLocation = () => {
    if (navigator.geolocation) {
      setIsProcessing(true);
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const lat = position.coords.latitude;
            const lon = position.coords.longitude;
            const res = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`,
            );
            const data = await res.json();
            if (data && data.address) {
              const addrParts = [];
              if (data.address.road) addrParts.push(data.address.road);
              if (data.address.suburb) addrParts.push(data.address.suburb);
              if (
                data.address.city ||
                data.address.town ||
                data.address.village
              )
                addrParts.push(
                  data.address.city ||
                    data.address.town ||
                    data.address.village,
                );
              if (data.address.state) addrParts.push(data.address.state);
              setAddress(addrParts.join(", "));
              if (data.address.postcode) {
                setPincode(data.address.postcode);
              }
            } else {
              setFormErrors((prev) => ({
                ...prev,
                address: "Could not fetch address details",
              }));
            }
          } catch (error) {
            console.error("Geocoding error", error);
            setFormErrors((prev) => ({
              ...prev,
              address: "Could not fetch address. Please enter manually.",
            }));
          } finally {
            setIsProcessing(false);
          }
        },
        (error) => {
          console.error(error);
          setFormErrors((prev) => ({
            ...prev,
            address: "Location permission denied or unavailable.",
          }));
          setIsProcessing(false);
        },
      );
    } else {
      setFormErrors((prev) => ({
        ...prev,
        address: "Geolocation is not supported by your browser.",
      }));
    }
  };

  useEffect(() => {
    if (user?.id) {
      getDocs(query(collection(db, "users", user.id, "addresses"), limit(10)))
        .then((snap) => {
          const addrs: any[] = [];
          snap.forEach((d) => addrs.push({ id: d.id, ...d.data() }));
          setSavedAddressesList(addrs);
        })
        .catch((e) => console.warn("Could not fetch saved addresses:", e));
    }
  }, [user]);

  const handleSavedAddress = async () => {
    if (user) {
      try {
        setIsProcessing(true);
        if (user.address) {
          setAddress(user.address);
          if (user.pincode) setPincode(user.pincode);
          if (user.phone) setPhone(user.phone);
          if (user.name) setName(user.name);
          setFormErrors((prev) => ({ ...prev, address: undefined }));
        }
        const q = query(
          collection(db, "users", user.id, "addresses"),
          limit(10),
        );
        const snap = await getDocs(q);
        if (!snap.empty) {
          const addrs: any[] = [];
          snap.forEach((d) => addrs.push({ id: d.id, ...d.data() }));
          setSavedAddressesList(addrs);

          const addr = addrs[0];
          if (addr.address) setAddress(addr.address);
          if (addr.pincode) setPincode(addr.pincode);
          if (addr.phone) setPhone(addr.phone);
          if (addr.name) setName(addr.name);
          setFormErrors((prev) => ({ ...prev, address: undefined }));
        } else if (!user.address) {
          setFormErrors((prev) => ({
            ...prev,
            address:
              "No saved address found. Please enter address manually below or click GPS.",
          }));
        }
      } catch (e) {
        console.error(e);
        if (user.address) {
          setAddress(user.address);
        } else {
          setFormErrors((prev) => ({
            ...prev,
            address:
              "Could not fetch saved address. Please enter manually below.",
          }));
        }
      } finally {
        setIsProcessing(false);
      }
    } else {
      setFormErrors((prev) => ({
        ...prev,
        address:
          "Please login to use saved addresses, or enter address manually below.",
      }));
    }
  };

  
  const getAuthToken = async () => {
    const auth = getAuth();
    if (auth.currentUser) {
      return await auth.currentUser.getIdToken();
    }
    return null;
  };

  const handleApplyPromo = async () => {
    const code = promoCode.trim();
    if (!code) return;
    setIsValidatingPromo(true);
    setPromoError("");
    try {
      const res = await fetch("/api/coupons/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          items: items.map((i) => ({
            id: i.id,
            baseId: i.baseId,
            quantity: i.quantity,
            selectedWeight: (i as any).selectedWeight || null,
            selectedCut: (i as any).selectedCut || null,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Invalid privilege code.");
      }
      setAppliedCoupon({
        code: data.couponCode,
        discountAmount: data.discountAmount,
        description: data.description,
      });
    } catch (e: any) {
      setAppliedCoupon(null);
      setPromoError(e.message || "Invalid privilege code.");
    } finally {
      setIsValidatingPromo(false);
    }
  };
  
  const validateForm = () => {
    const minOrder = settings.minOrderAmount || 0;
    if (minOrder > 0 && cartTotal < minOrder) {
      showToast(`Minimum order amount is ₹${minOrder}. Add ₹${(minOrder - cartTotal).toFixed(2)} more to checkout.`, "error");
      return false;
    }

    const errors: any = {};
    if (!name.trim()) errors.name = "Name is required";
    const normalizedPhone = phone.trim().replace(/[\s().-]/g, "");
    if (!normalizedPhone || !/^\+?[1-9]\d{6,14}$/.test(normalizedPhone))
      errors.phone = "Valid international phone number required";
    if (!address.trim()) errors.address = "Full Address is required";
    const postalCode = pincode.trim();
    if (!postalCode || postalCode.length < 2 || postalCode.length > 12)
      errors.pincode = "Valid postal / ZIP code is required";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      if ((window as any).Razorpay) {
        resolve(true);
        return;
      }
      if (
        document.querySelector(
          'script[src="https://checkout.razorpay.com/v1/checkout.js"]',
        )
      ) {
        // Script is in DOM but maybe not loaded yet. Let's wait a bit or resolve if available.
        setTimeout(() => resolve(!!(window as any).Razorpay), 2000);
        return;
      }
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      let handled = false;
      script.onload = () => {
        if (!handled) {
          handled = true;
          resolve(true);
        }
      };
      script.onerror = () => {
        if (!handled) {
          handled = true;
          resolve(false);
        }
      };
      document.body.appendChild(script);

      setTimeout(() => {
        if (!handled) {
          handled = true;
          resolve(false);
        }
      }, 5000); // 5 seconds timeout
    });
  };

  const saveUserAddressLocally = (
    addrStr: string,
    pinStr: string,
    nameStr: string,
  ) => {
    try {
      const existing = JSON.parse(
        localStorage.getItem(user?.id ? `jiyoo_saved_addresses_v2:${user.id}` : "jiyoo_saved_addresses_anonymous_v2") || "[]",
      );
      if (!existing.some((a: any) => a.address === addrStr)) {
        existing.unshift({
          name: nameStr || "Home",
          address: addrStr,
          pincode: pinStr,
        });
        localStorage.setItem(
          user?.id ? `jiyoo_saved_addresses_v2:${user.id}` : "jiyoo_saved_addresses_anonymous_v2",
          JSON.stringify(existing.slice(0, 5)),
        );
      }
      if (user?.id) {
        const addressesRef = collection(db, "users", user.id, "addresses");
        getDocs(query(addressesRef, where("address", "==", addrStr), limit(1)))
          .then((snap) => {
            if (snap.empty) {
              return addDoc(addressesRef, {
                name: nameStr || "Home",
                address: addrStr,
                pincode: pinStr,
                createdAt: serverTimestamp(),
              });
            }
          })
          .catch((e) => console.warn(e));
      }
    } catch (e) {
      console.warn(e);
    }
  };

  
  const requireCheckoutAuth = () => {
    if (user?.id) return true;
    showToast("Please log in to continue with checkout.", "error");
    onRequestAuth?.();
    return false;
  };

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requireCheckoutAuth()) return;
    if (!validateForm()) return;

    setIsProcessing(true);
    setFormErrors({});

    saveUserAddressLocally(address, pincode, name);

    const orderData = {
      userId: user?.id,
      subtotal: cartTotal,
      discountAmount,
      couponCode: appliedCoupon?.code || null,
      deliveryFee: effectiveDeliveryFee,
      amount: grandTotal,
      items: items.map((i) => ({
        id: i.id,
                baseId: i.baseId,
        name: i.name,
        quantity: i.quantity,
        price: getValidPrice(i),
            selectedWeight: (i as any).selectedWeight || null,
            selectedCut: (i as any).selectedCut || null,
            image: i.image,
      })),
      shippingDetails: { name, phone, address, pincode },
    };

    // Cash on Delivery
    if (paymentMethod === "cod") {
      try {
        const token = await getAuthToken();
      const headers: any = { "Content-Type": "application/json", "Idempotency-Key": getCheckoutIdempotencyKey() };
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const res = await fetch("/api/orders/create", {
        method: "POST",
        headers,
        body: JSON.stringify({
            items: items.map((i) => ({
              id: i.id,
              baseId: i.baseId,
              name: i.name,
              quantity: i.quantity,
              price: getValidPrice(i),
              selectedWeight: (i as any).selectedWeight,
              selectedCut: (i as any).selectedCut,
              image: i.image,
            })),
            shippingDetails: { name, phone, address, pincode },
            paymentMethod: "Cash on Delivery",
            userId: user?.id,
            couponCode: appliedCoupon?.code || null,
          }),
        });
        
        const apiData = await res.json();
        if (!res.ok || !apiData.success) {
          throw new Error(apiData.error || "Failed to create order on server");
        }
        
        const serverOrderId = apiData.orderId;
        
        // Save to local storage for quick history viewing
        try {
          const existing = JSON.parse(localStorage.getItem(user?.id ? `jiyoo_orders_history_v2:${user.id}` : "jiyoo_orders_history_anonymous_v2") || "[]");
          existing.unshift({
            id: serverOrderId,
            orderId: serverOrderId,
            ...orderData,
            paymentMethod: "Cash on Delivery",
            orderStatus: "pending",
            status: "pending",
            paymentStatus: "unpaid",
            createdAt: new Date().toISOString(),
          });
          localStorage.setItem(user?.id ? `jiyoo_orders_history_v2:${user.id}` : "jiyoo_orders_history_anonymous_v2", JSON.stringify(existing.slice(0, 50)));
        } catch (e) { console.warn(e); }

        sendEmailNotification(serverOrderId, { ...orderData, amount: grandTotal });

        setStep("success");
        resetCheckoutIdempotencyKey();
        setTimeout(clearCart, 1500);
      } catch (e: any) {
        console.error("Failed to save COD order:", e);
        showToast("Failed to confirm order. Please ensure your database is active. Error: " + e.message, "error");
      } finally {
        setIsProcessing(false);
      }
    } else if (paymentMethod === "razorpay") {
      try {
        const token = await getAuthToken();
        const headers: any = { "Content-Type": "application/json", "Idempotency-Key": getCheckoutIdempotencyKey() };
        if (token) headers["Authorization"] = `Bearer ${token}`;
        const res = await fetch("/api/razorpay/order", {
          method: "POST",
          headers,
          body: JSON.stringify({
            items: items.map((i) => ({
              id: i.id,
              baseId: i.baseId,
              name: i.name,
              quantity: i.quantity,
              price: getValidPrice(i),
              selectedWeight: (i as any).selectedWeight || null,
              selectedCut: (i as any).selectedCut || null,
              image: i.image,
            })),
            currency: "INR",
            couponCode: appliedCoupon?.code || null,
            shippingDetails: { name, phone, address, pincode },
          }),
        });
        
        const data = await res.json();
        
        if (data.isFallback) {
          setStep("upi_qr");
          setIsProcessing(false);
          return;
        }

        if (res.ok && data.success) {
          const options = {
            key: data.key_id,
            amount: data.order.amount,
            currency: data.order.currency,
            name: settings.storeName || "Store",
            description: "Order Payment",
            order_id: data.order.id,
            handler: async (response: any) => {
              try {
                const token = await getAuthToken();
                const headers: any = { "Content-Type": "application/json" };
                if (token) headers["Authorization"] = `Bearer ${token}`;
                const verifyRes = await fetch("/api/razorpay/verify", {
                  method: "POST",
                  headers,
                  body: JSON.stringify({
                    ...response,
                    items: items.map((i) => ({
                      id: i.id,
                      baseId: i.baseId,
                      name: i.name,
                      quantity: i.quantity,
                      price: getValidPrice(i),
                      selectedWeight: (i as any).selectedWeight || null,
                      selectedCut: (i as any).selectedCut || null,
                      image: i.image,
                    })),
                    shippingDetails: { name, phone, address, pincode },
                    userId: user?.id,
                    couponCode: appliedCoupon?.code || null,
                  }),
                });
                
                const verifyData = await verifyRes.json();
                
                if (verifyRes.ok && verifyData.success) {
                  const serverOrderId = verifyData.orderId;
                  sendEmailNotification(serverOrderId, { ...orderData, amount: grandTotal });
                  setStep("success");
                  resetCheckoutIdempotencyKey();
        setTimeout(clearCart, 1500);
                } else {
                  showToast("Payment verification failed. If money was deducted, contact us with your payment reference and we'll process a refund.", "error");
                  setStep("checkout");
                }
              } catch (e) {
                console.error("Verification error:", e);
                showToast("Payment verification failed.", "error");
                setStep("checkout");
              }
            },
            prefill: {
              name: name,
              contact: phone,
              email: user?.email || "",
            },
            theme: {
              color: "#059669",
            },
            modal: {
              ondismiss: function() {
                setIsProcessing(false);
              }
            }
          };

          if (typeof window !== "undefined" && (window as any).Razorpay) {
            const rzp = new (window as any).Razorpay(options);
            rzp.on("payment.failed", function (response: any) {
              console.error("Payment failed:", response.error);
              showToast("Payment failed: " + response.error.description, "error");
              setIsProcessing(false);
            });
            rzp.open();
          } else {
            setIsProcessing(false);
            showToast("Payment system is initializing. Please try again in a moment.", "error");
          }
        } else {
          setIsProcessing(false);
          showToast("Online payment is currently unavailable. Please use Cash on Delivery or WhatsApp.", "error");
        }
      } catch (err: any) {
        console.error("Checkout error:", err);
        setIsProcessing(false);
        showToast("Online payment is currently unavailable. Please use Cash on Delivery or WhatsApp.", "error");
      }
    }
  };

  
  
  const triggerWhatsAppOrder = async () => {
    if (!requireCheckoutAuth()) return;
    if (step === "cart") {
      setStep("checkout");
      return;
    }
    if (!validateForm()) return;

    setIsProcessing(true);
    try {
      const token = await getAuthToken();
      const headers: any = { "Content-Type": "application/json", "Idempotency-Key": getCheckoutIdempotencyKey() };
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const res = await fetch("/api/orders/create", {
        method: "POST",
        headers,
        body: JSON.stringify({
          items: items.map((i) => ({
            id: i.id,
            baseId: i.baseId,
            name: i.name,
            quantity: i.quantity,
            price: getValidPrice(i),
            selectedWeight: (i as any).selectedWeight,
            selectedCut: (i as any).selectedCut,
            image: i.image,
          })),
          shippingDetails: { name, phone, address, pincode },
          paymentMethod: "WhatsApp Express",
          userId: user?.id,
          couponCode: appliedCoupon?.code || null,
        }),
      });
      
      const apiData = await res.json();
      if (!res.ok || !apiData.success) {
        throw new Error(apiData.error || "Failed to create WhatsApp order on server");
      }
      
      const serverOrderId = apiData.orderId;

      const url = createWhatsAppOrderUrl({
        orderId: serverOrderId || undefined,
        whatsappNumber: settings.whatsappNumber,
        items: items.map((i) => ({
          name: i.name,
          quantity: i.quantity,
          price: i.price,
          numericPrice: getValidPrice(i),
          selectedWeight: (i as any).selectedWeight,
          selectedCut: (i as any).selectedCut,
        })),
        subtotal: cartTotal,
        deliveryFee: effectiveDeliveryFee,
        totalAmount: grandTotal,
        customerName: name || user?.name || "Customer",
        customerPhone: phone || user?.phone || "",
        customerAddress: address || user?.address || "N/A",
        customerPincode: pincode || user?.pincode || "N/A",
        paymentMethod:
          paymentMethod === "cod"
            ? "Cash on Delivery (WhatsApp)"
            : "WhatsApp Express",
      });
      setGeneratedWhatsAppUrl(url);
      setPendingOrderId(serverOrderId || null);
      setStep("success");
      window.open(url, "_blank");
      resetCheckoutIdempotencyKey();
      setTimeout(clearCart, 1500);
    } catch (e: any) {
      console.error("Failed to save WhatsApp order:", e);
      showToast("Failed to generate order reference. Please ensure your database is active. Error: " + (e.message || "Unknown error"), "error");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="cart-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            onClick={onClose}
          />
        )}
        {isOpen && (
          <motion.div
            key="cart-content"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="fixed top-0 bottom-0 right-0 w-full max-w-md bg-white shadow-2xl z-50 flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 pt-[calc(1.5rem+env(safe-area-inset-top))] pr-[calc(1.5rem+env(safe-area-inset-right))] pl-[calc(1.5rem+env(safe-area-inset-left))] border-b border-gray-100 bg-white z-10">
              <div className="flex items-center gap-4">
                {step === "checkout" && !user?.id && (
                  <motion.div
                    key="login_required"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="p-8 text-center min-h-full flex flex-col items-center justify-center"
                  >
                    <ShieldCheck className="w-10 h-10 text-gray-500 mb-4" />
                    <h2 className="text-2xl font-serif text-gray-900">Login required</h2>
                    <p className="mt-2 text-sm text-gray-500 max-w-sm">Please log in or create an account to continue with your order.</p>
                    <button type="button" onClick={() => onRequestAuth?.()} className="mt-6 w-full max-w-xs h-12 rounded-full bg-[#1C1917] text-[#FAF9F5] text-xs font-bold uppercase tracking-wider">
                      Log in / Sign up
                    </button>
                  </motion.div>
                )}

                {step === "checkout" && (
                  <button
                    onClick={() => setStep("cart")}
                    className="p-2 -ml-2 text-gray-400 hover:text-black transition-colors rounded-full hover:bg-gray-100"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                )}
                <h2 className="text-xl font-serif text-gray-900 tracking-wide">
                  {step === "cart"
                    ? "Your Bag"
                    : step === "checkout"
                      ? "Checkout"
                      : "Order Confirmed"}
                </h2>
              </div>
              <button
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-black transition-colors rounded-full hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto bg-gray-50/50 scrollbar-hide relative">
              <AnimatePresence mode="wait">
                {/* CART STEP */}
                {step === "cart" && (
                  <motion.div
                    key="cart"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.3 }}
                    className="p-6 flex flex-col min-h-full"
                  >
                    {items.length === 0 ? (
                      <div className="flex-1 flex flex-col items-center justify-center text-gray-400 space-y-6">
                        <ShoppingBag className="w-16 h-16 stroke-[1]" />
                        <p className="text-lg font-light tracking-wide">
                          Your bag is empty.
                        </p>
                        <button
                          onClick={onClose}
                          className="px-8 py-3 bg-black text-white text-sm tracking-widest uppercase hover:bg-gray-800 transition-colors"
                        >
                          Continue Shopping
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="space-y-6 flex-1">
                          {items.map((item) => (
                            <div
                              key={item.id}
                              className="flex gap-6 p-4 bg-white rounded-2xl shadow-sm border border-gray-100"
                            >
                              <div className="w-24 h-24 bg-gray-50 rounded-xl overflow-hidden relative flex-shrink-0">
                                {item.image ? (
                                  <img
                                    src={getOptimizedImageUrl(
                                      item.image,
                                      200,
                                      80,
                                    )}
                                    alt={item.name}
                                    className="w-full h-full object-contain bg-white"
                                    onError={(e) => {
                                      const target =
                                        e.target as HTMLImageElement;
                                      if (target.dataset.failed) return;

                                      const rawFallbackSequence = [
                                        item.image,
                                        '',
                                        settings?.logoUrl || "/logo.jpg",
                                        "/logo.jpg",
                                      ].filter(Boolean) as string[];

                                      // Remove duplicates to prevent stalling if src doesn't change
                                      const fallbackSequence = Array.from(
                                        new Set(rawFallbackSequence),
                                      );

                                      const currentAttempt = parseInt(
                                        target.dataset.attempt || "0",
                                        10,
                                      );

                                      if (
                                        currentAttempt < fallbackSequence.length
                                      ) {
                                        target.dataset.attempt = String(
                                          currentAttempt + 1,
                                        );
                                        // Ensure we don't assign the same URL it already failed on
                                        if (
                                          target.src.endsWith(
                                            fallbackSequence[currentAttempt],
                                          ) ||
                                          target.src ===
                                            fallbackSequence[currentAttempt]
                                        ) {
                                          target.src =
                                            fallbackSequence[
                                              Math.min(
                                                currentAttempt + 1,
                                                fallbackSequence.length - 1,
                                              )
                                            ];
                                          target.dataset.attempt = String(
                                            currentAttempt + 2,
                                          );
                                        } else {
                                          target.src =
                                            fallbackSequence[currentAttempt];
                                        }
                                      } else {
                                        target.dataset.failed = "true";
                                      }
                                    }}
                                  />
                                ) : (
                                  <div className="absolute inset-0 flex items-center justify-center text-gray-300">
                                    <ShoppingBag className="w-8 h-8 opacity-20" />
                                  </div>
                                )}
                              </div>
                              <div className="flex-1 flex flex-col justify-between py-1">
                                <div>
                                  <div className="flex justify-between items-start">
                                    <h3 className="font-medium text-gray-900">
                                      {item.name}
                                    </h3>
                                    <button
                                      onClick={() => removeFromCart(item.id)}
                                      className="text-gray-400 hover:text-red-500 transition-colors"
                                    >
                                      <X className="w-4 h-4" />
                                    </button>
                                  </div>
                                  <p className="text-gray-500 text-sm mt-1">
                                    ₹{getValidPrice(item)}
                                  </p>
                                </div>
                                <div className="flex items-center justify-between mt-4">
                                  <div className="flex items-center gap-4 bg-gray-50 rounded-lg p-1 border border-gray-100">
                                    <button
                                      onClick={() =>
                                        updateQuantity(
                                          item.id,
                                          Math.max(0, item.quantity - 1),
                                        )
                                      }
                                      className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-black hover:bg-white rounded-md transition-all shadow-sm"
                                    >
                                      <Minus className="w-3 h-3" />
                                    </button>
                                    <span className="w-4 text-center text-sm font-medium">
                                      {item.quantity}
                                    </span>
                                    <button
                                      onClick={() =>
                                        updateQuantity(
                                          item.id,
                                          item.quantity + 1,
                                        )
                                      }
                                      className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-black hover:bg-white rounded-md transition-all shadow-sm"
                                    >
                                      <Plus className="w-3 h-3" />
                                    </button>
                                  </div>
                                  <p className="font-medium text-gray-900 tracking-tight">
                                    ₹
                                    {getValidPrice(item) * item.quantity}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>



                        {/* PROMO CODE */}
                        <div className="mt-6 p-4 bg-[#FAF9F5] border border-stone-200 rounded-2xl">
                          <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#1C1917] mb-3">
                            Privilege Code
                          </h4>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={promoCode}
                              onChange={(e) => {
                                setPromoCode(e.target.value.toUpperCase());
                                setPromoError("");
                              }}
                              disabled={isPromoApplied}
                              placeholder="Enter Privilege Code"
                              className="flex-1 bg-white border border-stone-300 rounded-xl px-4 py-2.5 text-xs text-[#1C1917] font-mono tracking-wider outline-none focus:border-[#1C1917] transition-colors disabled:bg-stone-100 disabled:text-stone-500"
                            />
                            {isPromoApplied ? (
                              <button
                                onClick={() => {
                                  setAppliedCoupon(null);
                                  setPromoCode("");
                                  setPromoError("");
                                }}
                                className="px-5 py-2.5 bg-red-50 text-red-600 border border-red-200 rounded-xl text-[10px] uppercase font-bold tracking-wider hover:bg-red-100 transition-colors cursor-pointer active:scale-95"
                              >
                                Remove
                              </button>
                            ) : (
                              <button
                                onClick={handleApplyPromo}
                                disabled={isValidatingPromo || !promoCode.trim()}
                                className="px-5 py-2.5 bg-[#1C1917] text-[#FAF9F5] rounded-xl text-[10px] uppercase font-bold tracking-wider hover:bg-black transition-colors cursor-pointer active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {isValidatingPromo ? "Checking..." : "Apply"}
                              </button>
                            )}
                          </div>
                          {promoError && (
                            <p className="text-[10px] text-red-500 mt-2 font-medium">{promoError}</p>
                          )}
                          {isPromoApplied && (
                            <p className="text-[10px] text-emerald-600 mt-2 font-medium flex items-center gap-1">
                              <Check className="w-3 h-3" /> {appliedCoupon?.description || `Code applied: ₹${discountAmount} off`}
                            </p>
                          )}
                        </div>
                      </>
                    )}
                  </motion.div>
                )}

                {/* CHECKOUT STEP */}
                {step === "checkout" && (
                  <motion.div
                    key="checkout"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3 }}
                    className="p-6 space-y-8 pb-32"
                  >
                    {/* Delivery Info */}
                    <section className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-6">
                      <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                        <div className="flex items-center gap-2 text-gray-900">
                          <MapPin className="w-5 h-5 text-emerald-600" />
                          <h3 className="font-serif text-lg font-semibold">
                            Delivery Details
                          </h3>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setMapModalInitialTab("map");
                            setIsMapModalOpen(true);
                          }}
                          className="text-xs text-emerald-700 hover:text-emerald-800 font-semibold flex items-center gap-1.5 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg transition-colors border border-emerald-200/60 shadow-2xs"
                        >
                          <MapPin className="w-3.5 h-3.5" />
                          Pick on Google Map
                        </button>
                      </div>

                      <div className="flex flex-wrap sm:flex-nowrap gap-2 pt-1">
                        <button
                          type="button"
                          onClick={handleCurrentLocation}
                          disabled={isProcessing}
                          className="flex-1 flex items-center justify-center gap-2 py-2.5 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-semibold rounded-xl border border-emerald-200 transition-colors shadow-xs"
                        >
                          <Navigation className="w-3.5 h-3.5 text-emerald-600" />
                          {isProcessing
                            ? "Detecting Location..."
                            : "Auto-Detect GPS Location"}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setMapModalInitialTab("saved");
                            setIsMapModalOpen(true);
                          }}
                          disabled={isProcessing}
                          className="flex-1 flex items-center justify-center gap-2 py-2.5 px-3 bg-gray-50 hover:bg-gray-100 text-gray-700 text-xs font-medium rounded-xl border border-gray-200 transition-colors"
                        >
                          <Bookmark className="w-3.5 h-3.5 text-gray-500" />
                          Saved Addresses
                        </button>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <label className="block text-xs uppercase tracking-wider text-gray-500 mb-2 font-medium">
                            Full Name
                          </label>
                          <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className={`w-full bg-gray-50 border ${formErrors.name ? "border-red-300 focus:border-red-500" : "border-gray-200 focus:border-black"} rounded-xl p-3.5 text-gray-900 transition-colors outline-none`}
                            placeholder="Jane Doe"
                          />
                          {formErrors.name && (
                            <p className="text-red-500 text-xs mt-1.5">
                              {formErrors.name}
                            </p>
                          )}
                        </div>
                        <div>
                          <label className="block text-xs uppercase tracking-wider text-gray-500 mb-2 font-medium">
                            Phone Number
                          </label>
                          <input
                            type="tel"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            className={`w-full bg-gray-50 border ${formErrors.phone ? "border-red-300 focus:border-red-500" : "border-gray-200 focus:border-black"} rounded-xl p-3.5 text-gray-900 transition-colors outline-none`}
                            placeholder="+44 20 1234 5678"
                          />
                          {formErrors.phone && (
                            <p className="text-red-500 text-xs mt-1.5">
                              {formErrors.phone}
                            </p>
                          )}
                        </div>
                        <div>
                          <label className="block text-xs uppercase tracking-wider text-gray-500 mb-2 font-medium">
                            Full Address
                          </label>
                          <textarea
                            value={address}
                            onChange={(e) => setAddress(e.target.value)}
                            rows={2}
                            className={`w-full bg-gray-50 border ${formErrors.address ? "border-red-300 focus:border-red-500" : "border-gray-200 focus:border-black"} rounded-xl p-3.5 text-gray-900 transition-colors outline-none resize-none`}
                            placeholder="House No, Street, City, Landmark..."
                          />
                          {formErrors.address && (
                            <p className="text-red-500 text-xs mt-1.5">
                              {formErrors.address}
                            </p>
                          )}
                        </div>
                        <div>
                          <label className="block text-xs uppercase tracking-wider text-gray-500 mb-2 font-medium">
                            Postal / ZIP code
                          </label>
                          <input
                            type="text"
                            value={pincode}
                            onChange={(e) =>
                              setPincode(e.target.value.slice(0, 12))
                            }
                            className={`w-full bg-gray-50 border ${formErrors.pincode ? "border-red-300 focus:border-red-500" : "border-gray-200 focus:border-black"} rounded-xl p-3.5 text-gray-900 transition-colors outline-none`}
                            placeholder="Postal / ZIP code"
                          />
                          {formErrors.pincode && (
                            <p className="text-red-500 text-xs mt-1.5">
                              {formErrors.pincode}
                            </p>
                          )}
                        </div>
                      </div>
                    </section>

                    {/* Payment Method */}
                    <section className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-5">
                      <div className="flex items-center justify-between border-b border-gray-100 pb-3.5">
                        <div className="flex items-center gap-2 text-gray-900">
                          <CreditCard className="w-5 h-5 text-emerald-600" />
                          <h3 className="font-serif text-lg font-semibold">
                            Select Checkout Mode
                          </h3>
                        </div>
                        <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3 text-emerald-700" />{" "}
                          Verified Merchant
                        </span>
                      </div>

                      {/* Distinction Banner: WhatsApp vs UPI */}
                      <div className="grid grid-cols-2 gap-2 p-2 bg-gray-50 rounded-xl border border-gray-200/80 text-xs">
                        <div className="bg-white p-2.5 rounded-lg border border-gray-100 shadow-2xs space-y-1">
                          <span className="text-[10px] uppercase font-bold text-emerald-700 flex items-center gap-1">
                            <MessageCircle className="w-3 h-3 text-emerald-600 fill-emerald-100" />{" "}
                            WhatsApp
                          </span>
                          <p className="text-[11px] font-semibold text-gray-900 leading-tight">
                            Direct Chat Order
                          </p>
                          <p className="text-[10px] text-gray-500 leading-tight">
                            No advance payment needed
                          </p>
                        </div>
                        <div className="bg-white p-2.5 rounded-lg border border-gray-100 shadow-2xs space-y-1">
                          <span className="text-[10px] uppercase font-bold text-blue-700 flex items-center gap-1">
                            <Zap className="w-3 h-3 text-blue-600 fill-blue-100" />{" "}
                            Instant UPI
                          </span>
                          <p className="text-[11px] font-semibold text-gray-900 leading-tight">
                            Paytm QR / Mobile
                          </p>
                          <p className="text-[10px] text-gray-500 leading-tight">
                            Paytm, PhonePe, GPay
                          </p>
                        </div>
                      </div>

                      <div className="space-y-3">
                        

                        <button
                          type="button"
                          onClick={() => setPaymentMethod("razorpay")}
                          className={`w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all cursor-pointer ${
                            paymentMethod === "razorpay"
                              ? "border-black bg-gray-50"
                              : "border-gray-200 bg-white hover:border-gray-300"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                                paymentMethod === "razorpay"
                                  ? "border-black"
                                  : "border-gray-300"
                              }`}
                            >
                              {paymentMethod === "razorpay" && (
                                <div className="w-2.5 h-2.5 bg-black rounded-full" />
                              )}
                            </div>
                            <div className="text-left">
                              <span className="font-medium text-gray-900 block text-sm">
                                Online Payment (Cards, NetBanking, UPI)
                              </span>
                              <span className="text-xs text-gray-500 block">
                                Pay securely via Cards, NetBanking, UPI or Wallets
                              </span>
                            </div>
                          </div>
                          <ShieldCheck className="w-5 h-5 text-gray-700 flex-shrink-0" />
                        </button>

                        <button
                          type="button"
                          onClick={() => setPaymentMethod("cod")}
                          className={`w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all cursor-pointer ${
                            paymentMethod === "cod"
                              ? "border-black bg-gray-50"
                              : "border-gray-200 bg-white hover:border-gray-300"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                                paymentMethod === "cod"
                                  ? "border-black"
                                  : "border-gray-300"
                              }`}
                            >
                              {paymentMethod === "cod" && (
                                <div className="w-2.5 h-2.5 bg-black rounded-full" />
                              )}
                            </div>
                            <div className="text-left">
                              <span className="font-medium text-gray-900 block text-sm">
                                Cash on Delivery (COD)
                              </span>
                              <span className="text-xs text-gray-500 block">
                                Pay cash or UPI upon delivery
                              </span>
                            </div>
                          </div>
                          <Check className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                        </button>
                      </div>
                    </section>
                  </motion.div>
                )}

                {/* RAZORPAY FALLBACK STEP */}
                {step === "upi_qr" && (
                  <motion.div
                    key="upi_qr"
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    transition={{ duration: 0.25 }}
                    className="p-8 flex flex-col items-center justify-center text-center min-h-full space-y-5"
                  >
                    <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center text-amber-600 border border-amber-100 shadow-sm">
                      <CreditCard className="w-9 h-9" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-serif text-gray-900">Online payment is temporarily unavailable</h2>
                      <p className="mt-2 text-sm text-gray-500 max-w-sm leading-relaxed">
                        Your cart is safe. Choose Cash on Delivery, or go back and try online payment again in a moment.
                      </p>
                    </div>
                    <div className="w-full max-w-xs space-y-3 pt-2">
                      <button
                        type="button"
                        onClick={() => { if (requireCheckoutAuth()) { setPaymentMethod("cod"); setStep("checkout"); } }}
                        className="w-full py-3.5 bg-[#1C1917] text-[#FAF9F5] rounded-xl text-xs font-semibold tracking-wider uppercase hover:bg-black transition-colors"
                      >
                        Continue with Cash on Delivery
                      </button>
                      <button
                        type="button"
                        onClick={() => { if (requireCheckoutAuth()) setStep("checkout"); }}
                        className="w-full py-3 bg-gray-100 text-gray-700 rounded-xl text-xs font-medium tracking-wider uppercase hover:bg-gray-200 transition-colors"
                      >
                        Back to payment
                      </button>
                    </div>
                  </motion.div>
                )}

                {/* SUCCESS STEP */}
                
                
                {step === "whatsapp_confirm" && (
                  <motion.div key="whatsapp_confirm" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="p-8 flex flex-col items-center justify-center text-center min-h-full space-y-5">
                    <div className="w-24 h-24 bg-green-50 rounded-full flex items-center justify-center text-green-600 shadow-sm border border-green-100"><MessageCircle className="w-12 h-12" strokeWidth={2.5} /></div>
                    <h2 className="text-3xl font-serif text-gray-900">Order Reference Created</h2>
                    <p className="text-gray-500 leading-relaxed max-w-sm text-sm">Continue in WhatsApp to send the order details to JIYOO. Your order reference is already saved; you do not need to confirm that you sent the message.</p>
                    {pendingOrderId && <p className="font-mono text-xs font-bold text-stone-700">Order #{pendingOrderId}</p>}
                    <div className="w-full max-w-xs space-y-3 pt-2">
                      {generatedWhatsAppUrl && <a href={generatedWhatsAppUrl} target="_blank" rel="noopener noreferrer" className="w-full py-3.5 bg-emerald-600 text-white text-xs font-semibold tracking-wider uppercase hover:bg-emerald-700 transition-colors rounded-xl flex items-center justify-center gap-2 shadow-sm"><MessageCircle className="w-4 h-4" /> Open WhatsApp</a>}
                      <button type="button" onClick={() => { setStep("cart"); onClose(); }} className="w-full py-3.5 bg-gray-100 text-gray-700 text-xs font-semibold tracking-wider uppercase hover:bg-gray-200 transition-colors rounded-xl">Close</button>
                    </div>
                  </motion.div>
                )}

                {step === "success" && (
                  <motion.div
                    key="success"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="p-8 flex flex-col items-center justify-center text-center min-h-full space-y-6"
                  >
                    <div className="w-24 h-24 bg-green-50 rounded-full flex items-center justify-center text-green-600 mb-2 shadow-sm border border-green-100">
                      <Check className="w-12 h-12" strokeWidth={2.5} />
                    </div>
                    <h2 className="text-3xl font-serif text-gray-900">
                      Order Confirmed!
                    </h2>
                    <p className="text-gray-500 leading-relaxed max-w-xs text-sm">
                      Thank you for your order. We've recorded your order and
                      are preparing your fresh delivery.
                    </p>

                    <div className="w-full max-w-xs space-y-3 pt-4">
                      {generatedWhatsAppUrl ? (
                        <a
                          href={generatedWhatsAppUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full py-3.5 bg-emerald-600 text-white text-xs font-semibold tracking-wider uppercase hover:bg-emerald-700 transition-colors rounded-xl flex items-center justify-center gap-2 shadow-sm"
                        >
                          <MessageCircle className="w-4 h-4" /> Send Summary to WhatsApp
                        </a>
                      ) : (
                        <button
                          onClick={triggerWhatsAppOrder}
                          className="w-full py-3.5 bg-emerald-600 text-white text-xs font-semibold tracking-wider uppercase hover:bg-emerald-700 transition-colors rounded-xl flex items-center justify-center gap-2 shadow-sm"
                        >
                          <MessageCircle className="w-4 h-4" /> Send Summary to WhatsApp
                        </button>
                      )}

                      <button
                        onClick={onClose}
                        className="w-full py-3 bg-gray-100 text-gray-700 text-xs tracking-wider uppercase hover:bg-gray-200 transition-colors rounded-xl font-medium"
                      >
                        Return to Store
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Sticky Footer */}
            {step !== "success" && step !== "upi_qr" && items.length > 0 && (
              <div className="bg-white border-t border-gray-100 p-6 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] z-20 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
                <div className="space-y-3 mb-5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] uppercase tracking-wider font-bold text-gray-500">Order total</span>
                    <button type="button" onClick={() => setShowPriceBreakdown(v => !v)} className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-800">{showPriceBreakdown ? 'Hide breakdown' : 'View breakdown'}</button>
                  </div>
                  {showPriceBreakdown && <div className="space-y-3">
                  <div className="flex justify-between text-gray-500 text-sm">
                    <span>Subtotal</span>
                    <span>₹{cartTotal}</span>
                  </div>
                  {isPromoApplied && (
                    <div className="flex justify-between text-emerald-600 text-sm font-medium">
                      <span>Privilege Discount{appliedCoupon?.code ? ` (${appliedCoupon.code})` : ""}</span>
                      <span>-₹{discountAmount}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-gray-500 text-sm">
                    <span>Delivery Fee</span>
                    {effectiveDeliveryFee === 0 ? (
                      <span className="text-emerald-600 font-medium">Free</span>
                    ) : (
                      <span className="font-semibold text-gray-900">
                        ₹{effectiveDeliveryFee}
                      </span>
                    )}
                  </div>
                  </div>}
                  <div className="pt-3 border-t border-gray-100 flex justify-between text-gray-900 font-medium text-lg">
                    <span>Total</span>
                    <span className="font-bold text-gray-900">
                      ₹{grandTotal}
                    </span>
                  </div>
                </div>

                {step === "cart" ? (
                  <div className="space-y-3">
                    <button
                      onClick={() => { if (requireCheckoutAuth()) setStep("checkout"); }}
                      className="group relative flex w-full h-[56px] text-[11px] font-bold uppercase tracking-[0.15em] text-[#FAF9F5] bg-[#1C1917] transition-all duration-500 cursor-pointer rounded-full overflow-hidden shadow-[0_5px_15px_-5px_rgba(28,25,23,0.3)] hover:shadow-[0_8px_20px_-5px_rgba(28,25,23,0.4)] hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.96]"
                    >
                      <span className="absolute inset-0 w-full h-full bg-[#292524] opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                      <span className="relative z-10 flex items-center justify-center gap-2 w-full h-full">
                        Checkout (Online / COD)
                        <ArrowRight className="w-4 h-4 transition-transform duration-500 group-hover:translate-x-1" />
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={triggerWhatsAppOrder}
                      className="group relative flex w-full h-[56px] text-[11px] font-bold uppercase tracking-[0.15em] text-white bg-emerald-600 transition-all duration-500 cursor-pointer rounded-full overflow-hidden shadow-[0_5px_15px_-5px_rgba(5,150,105,0.3)] hover:shadow-[0_8px_20px_-5px_rgba(5,150,105,0.4)] hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.96]"
                    >
                      <span className="absolute inset-0 w-full h-full bg-emerald-700 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                      <span className="relative z-10 flex items-center justify-center gap-2 w-full h-full">
                        <MessageCircle className="w-4 h-4" />
                        Order via WhatsApp
                      </span>
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <button
                      onClick={handleCheckout}
                      disabled={isProcessing}
                      className="group relative flex w-full h-[56px] text-[11px] font-bold uppercase tracking-[0.15em] text-[#FAF9F5] bg-[#1C1917] transition-all duration-500 cursor-pointer rounded-full overflow-hidden shadow-[0_5px_15px_-5px_rgba(28,25,23,0.3)] hover:shadow-[0_8px_20px_-5px_rgba(28,25,23,0.4)] hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.96] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <span className="absolute inset-0 w-full h-full bg-[#292524] opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                      <span className="relative z-10 flex items-center justify-center gap-2 w-full h-full">
                        {isProcessing ? (
                          <div className="flex items-center gap-2">
                            <div className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" /> Processing...
                          </div>
                        ) : (
                          <>
                            {paymentMethod === "cod"
                              ? `Place Order (COD ₹${grandTotal})`
                              : `Pay Online ₹${grandTotal}`}
                            <ArrowRight className="w-4 h-4 transition-transform duration-500 group-hover:translate-x-1" />
                          </>
                        )}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={triggerWhatsAppOrder}
                      className="group relative flex w-full h-[56px] text-[11px] font-bold uppercase tracking-[0.15em] text-[#1C1917] bg-transparent border border-[#1C1917] transition-all duration-500 cursor-pointer rounded-full overflow-hidden hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.96]"
                    >
                      <span className="absolute inset-0 w-full h-full bg-[#1C1917] opacity-0 group-hover:opacity-5 transition-opacity duration-500" />
                      <span className="relative z-10 flex items-center justify-center gap-2 w-full h-full">
                        <MessageCircle className="w-4 h-4" />
                        Instant Order via WhatsApp
                      </span>
                    </button>
                  </div>
                )}
                
                <div className="mt-6 pt-4 border-t border-stone-100 flex flex-col items-center justify-center gap-3">
                  <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-emerald-700 font-bold">
                    <ShieldCheck className="w-3.5 h-3.5" /> 100% Secure Checkout
                  </div>
                  <div className="flex items-center justify-center gap-4 opacity-50 grayscale hover:grayscale-0 transition-all duration-500">
                     <img src="https://upload.wikimedia.org/wikipedia/commons/f/fa/UPI-Logo.png" alt="UPI" className="h-4 object-contain" />
                     <img src="https://upload.wikimedia.org/wikipedia/commons/a/a4/Mastercard_2019_logo.svg" alt="Mastercard" className="h-5 object-contain" />
                     <img src="https://upload.wikimedia.org/wikipedia/commons/5/5e/Visa_Inc._logo.svg" alt="Visa" className="h-3.5 object-contain" />
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
      <LocationPickerModal
        isOpen={isMapModalOpen}
        initialTab={mapModalInitialTab}
        onClose={() => setIsMapModalOpen(false)}
        onSelectLocation={({ address: newAddr, pincode: newPin }) => {
          setAddress(newAddr);
          if (newPin) setPincode(newPin);
          setFormErrors((prev) => ({
            ...prev,
            address: undefined,
            pincode: undefined,
          }));

          // Save to local storage cache for instant reuse
          try {
            const existing = JSON.parse(
              localStorage.getItem(user?.id ? `jiyoo_saved_addresses_v2:${user.id}` : "jiyoo_saved_addresses_anonymous_v2") || "[]",
            );
            if (!existing.some((a: any) => a.address === newAddr)) {
              existing.unshift({
                name: "Saved Address",
                address: newAddr,
                pincode: newPin,
              });
              localStorage.setItem(
                user?.id ? `jiyoo_saved_addresses_v2:${user.id}` : "jiyoo_saved_addresses_anonymous_v2",
                JSON.stringify(existing.slice(0, 5)),
              );
            }
          } catch (e) {
            console.warn(e);
          }
        }}
        savedAddresses={savedAddressesList}
      />
    </>
  );
}
