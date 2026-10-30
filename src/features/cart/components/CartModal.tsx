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
  ChevronLeft,
  MessageCircle,
  Navigation,
  Bookmark,
  Zap,
} from "lucide-react";
import { PremiumShieldMark } from "../../core/components/PremiumShieldMark";
import { RealisticDeliveryScooter } from "../../core/components/RealisticDeliveryScooter";
import {
  GooglePayIcon,
  PhonePeIcon,
  PaytmIcon,
  UpiOfficialIcon,
  VisaIcon,
  MastercardIcon,
  RuPayIcon,
  UpiAppsPillRow,
} from "../../core/components/UpiIcons";
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
import {
  DEFAULT_RETAIL_AREAS,
  RetailAreaItem,
  normalizeIndianPincode,
} from "../../../constants/deliveryAreas";

// Trust & Payment Method Official Brand Logos
const PaytmLogo = ({ className = "h-4 w-auto" }: { className?: string }) => (
  <PaytmIcon className={className} />
);

const UpiLogo = ({ className = "h-4 w-auto" }: { className?: string }) => (
  <UpiOfficialIcon className={className} />
);

const PhonePeBadge = ({ className = "h-4 w-auto" }: { className?: string }) => (
  <div className={`inline-flex items-center gap-1 ${className}`}>
    <PhonePeIcon className="h-4 w-4" />
    <span className="text-[11px] font-bold text-[#5F259E] leading-none">PhonePe</span>
  </div>
);

const GPayBadge = ({ className = "h-4 w-auto" }: { className?: string }) => (
  <GooglePayIcon className={className} />
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
  const [isWhatsAppCheckoutMode, setIsWhatsAppCheckoutMode] = useState(false);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [whatsappPhone, setWhatsappPhone] = useState("");
  const [houseNo, setHouseNo] = useState("");
  const [street, setStreet] = useState("");
  const [area, setArea] = useState("");
  const [city, setCity] = useState("Bangalore");
  const [state, setState] = useState("Karnataka");
  const [landmark, setLandmark] = useState("");
  const [addressType, setAddressType] = useState<"Home" | "Work" | "Other">("Home");
  const [deliveryInstructions, setDeliveryInstructions] = useState("");
  const [address, setAddress] = useState("");
  const [pincode, setPincode] = useState("");
  const [orderType, setOrderType] = useState<"retail" | "wholesale">("retail");
  const [selectedRetailArea, setSelectedRetailArea] = useState<string>("");
  const [activeRetailAreas, setActiveRetailAreas] = useState<RetailAreaItem[]>(
    DEFAULT_RETAIL_AREAS,
  );
  const [priceVerifiedState, setPriceVerifiedState] = useState<boolean>(true);
  const [formErrors, setFormErrors] = useState<{
    name?: string;
    phone?: string;
    whatsappPhone?: string;
    houseNo?: string;
    street?: string;
    area?: string;
    city?: string;
    state?: string;
    address?: string;
    pincode?: string;
  }>({});

  useEffect(() => {
    if (user) {
      setName((prev) => prev || user.name || user.displayName || "");
      if (user.phone) setPhone((prev) => prev || user.phone);
    }
  }, [user]);

  // Listen for direct "Order via WhatsApp" trigger from ProductDetailModal
  useEffect(() => {
    const handleOpenWhatsAppCheckout = () => {
      setIsWhatsAppCheckoutMode(true);
      setStep("checkout");
    };
    document.addEventListener("open-whatsapp-checkout", handleOpenWhatsAppCheckout);
    return () => {
      document.removeEventListener("open-whatsapp-checkout", handleOpenWhatsAppCheckout);
    };
  }, []);

  // Keep composite address synced with structured fields
  useEffect(() => {
    const parts = [
      houseNo.trim(),
      street.trim(),
      area.trim(),
      landmark.trim() ? `Near ${landmark.trim()}` : "",
      city.trim(),
      state.trim(),
    ].filter(Boolean);
    if (parts.length > 0) {
      setAddress(parts.join(", "));
    }
  }, [houseNo, street, area, landmark, city, state]);

  // Reset state when opened/closed & sync active retail areas from server
  useEffect(() => {
    if (!isOpen) {
      setTimeout(() => {
        setStep("cart");
        setIsWhatsAppCheckoutMode(false);
      }, 300);
    } else {
      syncCartPrices();
      fetch("/api/delivery/active-areas")
        .then((r) => r.json())
        .then((data) => {
          const areas = Array.isArray(data?.retailAreas)
            ? data.retailAreas
            : Array.isArray(data?.areas)
              ? data.areas
              : null;
          if (data?.success && areas && areas.length > 0) {
            setActiveRetailAreas(areas);
          }
        })
        .catch(() => {
          // Keep default 13 active retail areas when offline
        });
    }
  }, [isOpen]);

  const populateStructuredFromRawAddress = (rawAddr: string, rawPin?: string) => {
    setAddress(rawAddr);
    if (rawPin) setPincode(rawPin);
    const segments = rawAddr
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (!houseNo.trim() && segments[0]) setHouseNo(segments[0]);
    if (!street.trim() && segments[1]) setStreet(segments[1]);
    if (!area.trim() && segments[2]) setArea(segments[2]);
    else if (!area.trim() && segments[1]) setArea(segments[1]);
  };

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
              if (data.address.house_number) {
                setHouseNo((prev) => prev || data.address.house_number);
                addrParts.push(data.address.house_number);
              }
              if (data.address.road) {
                setStreet((prev) => prev || data.address.road);
                addrParts.push(data.address.road);
              }
              if (data.address.suburb || data.address.neighbourhood) {
                const detectedArea = data.address.suburb || data.address.neighbourhood;
                setArea((prev) => prev || detectedArea);
                addrParts.push(detectedArea);
              }
              if (
                data.address.city ||
                data.address.town ||
                data.address.village
              ) {
                const detectedCity =
                  data.address.city ||
                  data.address.town ||
                  data.address.village;
                setCity(detectedCity);
                addrParts.push(detectedCity);
              }
              if (data.address.state) {
                setState(data.address.state);
                addrParts.push(data.address.state);
              }
              const joined = addrParts.join(", ");
              populateStructuredFromRawAddress(joined, data.address.postcode);
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
          populateStructuredFromRawAddress(user.address, user.pincode);
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
          if (addr.address) populateStructuredFromRawAddress(addr.address, addr.pincode);
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
          populateStructuredFromRawAddress(user.address, user.pincode);
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
    if (!name.trim() || name.trim().length < 2) {
      errors.name = "Full Name is required";
    }
    const normalizedPhone = phone.trim().replace(/[\s().-]/g, "").replace(/^0+/, "");
    if (!normalizedPhone || !/^\+?[1-9]\d{6,14}$/.test(normalizedPhone) || !/^(\+?91)?[6-9]\d{9}$/.test(normalizedPhone)) {
      errors.phone = "Valid 10-digit Indian mobile number required (Valid international phone number required)";
    }
    if (whatsappPhone.trim()) {
      const normalizedWa = whatsappPhone.trim().replace(/[\s().-]/g, "").replace(/^0+/, "");
      if (!/^\+?[1-9]\d{6,14}$/.test(normalizedWa)) {
        errors.whatsappPhone = "Enter a valid WhatsApp mobile number";
      }
    }
    if (!houseNo.trim()) {
      errors.houseNo = "House / Flat No. is required";
    }
    if (!street.trim()) {
      errors.street = "Building / Street / Road is required";
    }
    if (!area.trim()) {
      errors.area = "Area / Locality is required";
    }
    if (!city.trim()) {
      errors.city = "City is required";
    }
    if (!state.trim()) {
      errors.state = "State is required";
    }
    const compositeAddress =
      address.trim() ||
      [houseNo.trim(), street.trim(), area.trim(), city.trim(), state.trim()]
        .filter(Boolean)
        .join(", ");
    if (!compositeAddress || compositeAddress.length < 5) {
      errors.address = "Full delivery address is required";
    }
    const postalCode = normalizeIndianPincode(pincode);
    if (!postalCode || !/^[1-9]\d{5}$/.test(postalCode)) {
      errors.pincode = "Valid 6-digit Indian PIN code is required";
    }
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
    setIsWhatsAppCheckoutMode(false);
    if (user?.id) return true;
    showToast("Please log in to continue with Online / COD checkout.", "error");
    onRequestAuth?.();
    return false;
  };

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requireCheckoutAuth()) return;
    if (!validateForm()) return;

    const cleanPin = normalizeIndianPincode(pincode);
    if (orderType === "retail") {
      const enabledPins = new Set(
        activeRetailAreas.filter((a) => a.enabled).map((a) => a.pincode),
      );
      if (enabledPins.size > 0 && !enabledPins.has(cleanPin)) {
        showToast(
          `Retail delivery is currently active only in our 13 Bangalore areas (PINs: ${Array.from(enabledPins).join(", ")}).`,
          "error",
        );
        return;
      }
    }

    setIsProcessing(true);
    setFormErrors({});

    const formattedFullAddress =
      [
        houseNo.trim(),
        street.trim(),
        area.trim(),
        landmark.trim() ? `Landmark: ${landmark.trim()}` : "",
        city.trim(),
        state.trim(),
      ]
        .filter(Boolean)
        .join(", ") || address.trim();

    saveUserAddressLocally(formattedFullAddress, cleanPin, name);

    const shippingPayload = {
      name: name.trim(),
      phone: phone.trim(),
      whatsappPhone: (whatsappPhone.trim() || phone.trim()),
      houseNo: houseNo.trim(),
      street: street.trim(),
      area: area.trim(),
      city: city.trim(),
      state: state.trim(),
      landmark: landmark.trim(),
      addressType,
      deliveryInstructions: deliveryInstructions.trim(),
      address: formattedFullAddress,
      pincode: cleanPin,
    };

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
      shippingDetails: shippingPayload,
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
            shippingDetails: shippingPayload,
            paymentMethod: "Cash on Delivery",
            userId: user?.id,
            couponCode: appliedCoupon?.code || null,
            orderType,
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
        showToast("Failed to confirm order: " + e.message, "error");
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
            shippingDetails: shippingPayload,
            orderType,
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
                    shippingDetails: shippingPayload,
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

          const sdkReady = await loadRazorpayScript();
          if (sdkReady && typeof window !== "undefined" && (window as any).Razorpay) {
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
    // Guest WhatsApp checkout does NOT require login!
    // If user is currently in cart step, navigate them to checkout first so they fill all required delivery details.
    if (step === "cart") {
      setIsWhatsAppCheckoutMode(true);
      setStep("checkout");
      showToast(
        "Please enter your delivery details (Full Name, Mobile Number, Address, Area, City & PIN Code) to complete your WhatsApp order.",
        "info",
      );
      return;
    }

    if (!validateForm()) {
      showToast(
        "All mandatory delivery details (Full Name, Mobile Number, House No, Street, Area, City & PIN Code) are required before opening WhatsApp.",
        "error",
      );
      return;
    }

    const minOrder = settings.minOrderAmount || 0;
    if (minOrder > 0 && cartTotal < minOrder) {
      showToast(
        `Minimum order amount is ₹${minOrder}. Add ₹${(minOrder - cartTotal).toFixed(2)} more to continue.`,
        "error",
      );
      return;
    }

    const cleanPin = normalizeIndianPincode(pincode);
    if (orderType === "retail") {
      const enabledPins = new Set(
        activeRetailAreas.filter((a) => a.enabled).map((a) => a.pincode),
      );
      if (enabledPins.size > 0 && !enabledPins.has(cleanPin)) {
        showToast(
          `Retail delivery is currently active only in our 13 Bangalore areas (PINs: ${Array.from(enabledPins).join(", ")}).`,
          "error",
        );
        return;
      }
    } else if (!/^[1-9]\d{5}$/.test(cleanPin)) {
      showToast("Please enter a valid 6-digit Indian PIN code.", "error");
      return;
    }

    const formattedFullAddress =
      [
        houseNo.trim(),
        street.trim(),
        area.trim(),
        landmark.trim() ? `Landmark: ${landmark.trim()}` : "",
        city.trim(),
        state.trim(),
      ]
        .filter(Boolean)
        .join(", ") || address.trim();

    saveUserAddressLocally(formattedFullAddress, cleanPin, name);

    setIsProcessing(true);
    let serverOrderId: string | null;
    let verificationCode: string | undefined;
    let verifiedSubtotal = cartTotal;
    let verifiedDiscount = discountAmount;
    let verifiedDeliveryFee = effectiveDeliveryFee;
    let verifiedGrandTotal = grandTotal;
    let isServerPriceVerified: boolean;

    try {
      const token = await getAuthToken().catch(() => null);
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "Idempotency-Key": getCheckoutIdempotencyKey(),
      };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch("/api/whatsapp/prepare-order", {
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
          shippingDetails: {
            name: name.trim(),
            phone: phone.trim(),
            whatsappPhone: whatsappPhone.trim() || phone.trim(),
            houseNo: houseNo.trim(),
            street: street.trim(),
            area: area.trim(),
            city: city.trim(),
            state: state.trim(),
            landmark: landmark.trim(),
            addressType,
            deliveryInstructions: deliveryInstructions.trim(),
            address: formattedFullAddress,
            pincode: cleanPin,
          },
          couponCode: appliedCoupon?.code || null,
          orderType,
        }),
      });

      const apiData = await res.json().catch(() => ({}));
      if (!res.ok || !apiData.success) {
        throw new Error(apiData.error || "Could not validate WhatsApp order");
      }

      serverOrderId = apiData.orderId || null;
      verificationCode = apiData.verificationCode || undefined;
      if (typeof apiData.subtotal === "number") verifiedSubtotal = apiData.subtotal;
      if (typeof apiData.discountAmount === "number") verifiedDiscount = apiData.discountAmount;
      if (typeof apiData.deliveryFee === "number") verifiedDeliveryFee = apiData.deliveryFee;
      if (typeof apiData.grandTotal === "number") verifiedGrandTotal = apiData.grandTotal;
      isServerPriceVerified = apiData.priceVerified !== false;
      setPriceVerifiedState(isServerPriceVerified);
    } catch (e: any) {
      if (
        e?.message &&
        (e.message.includes("PIN code") ||
          e.message.includes("stock") ||
          e.message.includes("Minimum") ||
          e.message.includes("unavailable") ||
          e.message.includes("mandatory") ||
          e.message.includes("required"))
      ) {
        showToast(e.message, "error");
        setIsProcessing(false);
        return;
      }
      // Resilient fallback when server/database is unreachable: explicitly mark priceVerified = false
      const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
      const rand = Array.from(crypto.getRandomValues(new Uint8Array(6)))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("")
        .toUpperCase();
      serverOrderId = `JY-${dateStr}-${rand}`;
      verificationCode = `LOC-${rand.slice(0, 6)}`;
      isServerPriceVerified = false;
      setPriceVerifiedState(false);
    }

    try {
      const url = createWhatsAppOrderUrl({
        orderId: serverOrderId || undefined,
        verificationCode,
        orderType,
        priceVerified: isServerPriceVerified,
        whatsappNumber: settings.whatsappNumber,
        items: items.map((i) => ({
          name: i.name,
          quantity: i.quantity,
          price: i.price,
          numericPrice: getValidPrice(i),
          selectedWeight: (i as any).selectedWeight,
          selectedCut: (i as any).selectedCut,
        })),
        subtotal: verifiedSubtotal,
        discountAmount: verifiedDiscount,
        deliveryFee: verifiedDeliveryFee,
        totalAmount: verifiedGrandTotal,
        customerName: name.trim(),
        customerPhone: phone.trim(),
        customerHouseNo: houseNo.trim(),
        customerStreet: street.trim(),
        customerCity: city.trim(),
        customerState: state.trim(),
        customerLandmark: landmark.trim() || undefined,
        customerAddressType: addressType,
        deliveryInstructions: deliveryInstructions.trim() || undefined,
        selectedArea: selectedRetailArea || area.trim() || undefined,
        customerAddress: formattedFullAddress,
        customerPincode: cleanPin,
        paymentMethod: "WhatsApp Express (Guest / Direct)",
      });
      setGeneratedWhatsAppUrl(url);
      setPendingOrderId(serverOrderId || null);
      setStep("whatsapp_confirm");
      resetCheckoutIdempotencyKey();
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="cart-content"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-0 w-full h-screen supports-[height:100dvh]:h-[100dvh] bg-[#FAF9F5] z-50 flex flex-col overflow-hidden overscroll-contain"
          >
            {/* Header */}
            <div className="shrink-0 border-b border-[#E7E3DA] bg-white/95 backdrop-blur-md z-20 pt-[env(safe-area-inset-top)]">
              <div className="max-w-6xl mx-auto w-full flex items-center justify-between px-4 sm:px-6 lg:px-8 py-3.5 sm:py-4">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      if (step === "checkout") {
                        setStep("cart");
                      } else {
                        onClose();
                      }
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-stone-700 hover:text-[#1C1917] bg-[#FAF9F5] hover:bg-stone-200/70 border border-[#E7E3DA] rounded-full transition-colors cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>{step === "checkout" ? "Back to Bag" : "Store"}</span>
                  </button>
                  <div>
                    <div className="flex items-center gap-2.5">
                      <h2 className="text-lg sm:text-xl font-serif font-semibold text-[#1C1917] tracking-wide">
                        {step === "cart"
                          ? "Your Bag"
                          : step === "checkout"
                            ? isWhatsAppCheckoutMode
                              ? "WhatsApp Delivery Details"
                              : "Secure Checkout"
                            : "Order Reference"}
                      </h2>
                      {items.length > 0 && (
                        <span className="px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider bg-[#1C1917] text-[#FAF9F5] rounded-full">
                          {cartCount} {cartCount === 1 ? "item" : "items"}
                        </span>
                      )}
                    </div>
                    {step === "checkout" && isWhatsAppCheckoutMode && (
                      <p className="text-[11px] font-medium text-emerald-700">
                        Guest WhatsApp Checkout — No login required
                      </p>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close bag"
                  className="p-2 text-stone-500 hover:text-[#1C1917] transition-colors rounded-full hover:bg-stone-100 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto overscroll-contain bg-[#FAF9F5] relative">
              <div
                className={
                  step !== "success" &&
                  step !== "whatsapp_confirm" &&
                  step !== "upi_qr" &&
                  items.length > 0
                    ? "max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-5 sm:py-8 lg:grid lg:grid-cols-12 lg:gap-8 lg:items-start"
                    : "max-w-2xl mx-auto w-full px-4 sm:px-6 py-6 sm:py-10"
                }
              >
                <div
                  className={
                    step !== "success" &&
                    step !== "whatsapp_confirm" &&
                    step !== "upi_qr" &&
                    items.length > 0
                      ? "lg:col-span-7 min-w-0"
                      : "w-full"
                  }
                >
                  <AnimatePresence mode="wait">
                    {/* CART STEP */}
                    {step === "cart" && (
                      <motion.div
                        key="cart"
                        initial={{ opacity: 0, x: -16 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 16 }}
                        transition={{ duration: 0.25 }}
                        className="flex flex-col min-h-full"
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

                        {/* PROMO / COUPON CODE */}
                        <div className="mt-6 p-4 bg-[#FAF9F5] border border-stone-200 rounded-2xl">
                          <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#1C1917] mb-3">
                            Coupon Code
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
                              placeholder="Enter Coupon Code"
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
                    className="p-6 space-y-6 pb-32"
                  >
                    {/* Delivery Info */}
                    <section className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 space-y-5">
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

                      <div className="flex flex-wrap sm:flex-nowrap gap-2">
                        <button
                          type="button"
                          onClick={handleCurrentLocation}
                          disabled={isProcessing}
                          className="flex-1 flex items-center justify-center gap-2 py-2.5 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-semibold rounded-xl border border-emerald-200 transition-colors shadow-xs"
                        >
                          <Navigation className="w-3.5 h-3.5 text-emerald-600" />
                          {isProcessing
                            ? "Detecting Location..."
                            : "Auto-Detect GPS"}
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
                        {/* Active Bangalore Retail Area Quick-Select */}
                        <div className="p-3.5 bg-emerald-50/50 border border-emerald-200/80 rounded-xl space-y-2">
                          <div className="flex items-center justify-between">
                            <label className="block text-[11px] uppercase tracking-wider text-emerald-950 font-bold">
                              Select Delivery Locality (13 Active Areas)
                            </label>
                            <span className="text-[10px] font-semibold text-emerald-700">
                              Auto-fills Area &amp; PIN
                            </span>
                          </div>
                          <select
                            value={selectedRetailArea}
                            onChange={(e) => {
                              const areaVal = e.target.value;
                              setSelectedRetailArea(areaVal);
                              const match = activeRetailAreas.find(
                                (a) => `${a.areaName} (${a.displayPincode})` === areaVal,
                              );
                              if (match) {
                                setArea(match.areaName);
                                setPincode(match.pincode);
                                setCity("Bangalore");
                                setState("Karnataka");
                                setFormErrors((prev) => ({
                                  ...prev,
                                  area: undefined,
                                  pincode: undefined,
                                }));
                              }
                            }}
                            className="w-full bg-white border border-emerald-200 rounded-xl px-3 py-2.5 text-xs text-gray-900 font-medium outline-none focus:border-emerald-600"
                          >
                            <option value="">
                              -- Choose from 13 Active Bangalore Retail Areas --
                            </option>
                            {activeRetailAreas
                              .filter((a) => a.enabled)
                              .map((a) => (
                                <option
                                  key={a.id}
                                  value={`${a.areaName} (${a.displayPincode})`}
                                >
                                  {a.slNo}. {a.areaName} — {a.displayPincode}
                                </option>
                              ))}
                          </select>
                        </div>

                        {/* Full Name */}
                        <div>
                          <label className="block text-xs uppercase tracking-wider text-gray-600 mb-1.5 font-semibold">
                            Full Name <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className={`w-full bg-gray-50 border ${formErrors.name ? "border-red-300 focus:border-red-500" : "border-gray-200 focus:border-black"} rounded-xl p-3 text-sm text-gray-900 transition-colors outline-none`}
                            placeholder="Enter your full name"
                          />
                          {formErrors.name && (
                            <p className="text-red-500 text-xs mt-1">
                              {formErrors.name}
                            </p>
                          )}
                        </div>

                        {/* Mobile Number & WhatsApp Number */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs uppercase tracking-wider text-gray-600 mb-1.5 font-semibold">
                              Mobile Number <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="tel"
                              value={phone}
                              onChange={(e) => setPhone(e.target.value)}
                              className={`w-full bg-gray-50 border ${formErrors.phone ? "border-red-300 focus:border-red-500" : "border-gray-200 focus:border-black"} rounded-xl p-3 text-sm text-gray-900 transition-colors outline-none`}
                              placeholder="10-digit mobile number"
                            />
                            {formErrors.phone && (
                              <p className="text-red-500 text-xs mt-1">
                                {formErrors.phone}
                              </p>
                            )}
                          </div>
                          <div>
                            <label className="block text-xs uppercase tracking-wider text-gray-600 mb-1.5 font-semibold">
                              WhatsApp No. <span className="text-gray-400 font-normal">(Optional)</span>
                            </label>
                            <input
                              type="tel"
                              value={whatsappPhone}
                              onChange={(e) => setWhatsappPhone(e.target.value)}
                              className={`w-full bg-gray-50 border ${formErrors.whatsappPhone ? "border-red-300 focus:border-red-500" : "border-gray-200 focus:border-black"} rounded-xl p-3 text-sm text-gray-900 transition-colors outline-none`}
                              placeholder={phone || "Same as mobile number"}
                            />
                            {formErrors.whatsappPhone && (
                              <p className="text-red-500 text-xs mt-1">
                                {formErrors.whatsappPhone}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* House / Flat No & Building / Street */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs uppercase tracking-wider text-gray-600 mb-1.5 font-semibold">
                              House / Flat No. <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="text"
                              value={houseNo}
                              onChange={(e) => setHouseNo(e.target.value)}
                              className={`w-full bg-gray-50 border ${formErrors.houseNo ? "border-red-300 focus:border-red-500" : "border-gray-200 focus:border-black"} rounded-xl p-3 text-sm text-gray-900 transition-colors outline-none`}
                              placeholder="Flat / House / Door No."
                            />
                            {formErrors.houseNo && (
                              <p className="text-red-500 text-xs mt-1">
                                {formErrors.houseNo}
                              </p>
                            )}
                          </div>
                          <div>
                            <label className="block text-xs uppercase tracking-wider text-gray-600 mb-1.5 font-semibold">
                              Building &amp; Street <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="text"
                              value={street}
                              onChange={(e) => setStreet(e.target.value)}
                              className={`w-full bg-gray-50 border ${formErrors.street ? "border-red-300 focus:border-red-500" : "border-gray-200 focus:border-black"} rounded-xl p-3 text-sm text-gray-900 transition-colors outline-none`}
                              placeholder="Apartment, Street / Main Rd"
                            />
                            {formErrors.street && (
                              <p className="text-red-500 text-xs mt-1">
                                {formErrors.street}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Area / Locality & Landmark */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs uppercase tracking-wider text-gray-600 mb-1.5 font-semibold">
                              Area / Locality <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="text"
                              value={area}
                              onChange={(e) => setArea(e.target.value)}
                              className={`w-full bg-gray-50 border ${formErrors.area ? "border-red-300 focus:border-red-500" : "border-gray-200 focus:border-black"} rounded-xl p-3 text-sm text-gray-900 transition-colors outline-none`}
                              placeholder="e.g. Frazer Town, Banaswadi"
                            />
                            {formErrors.area && (
                              <p className="text-red-500 text-xs mt-1">
                                {formErrors.area}
                              </p>
                            )}
                          </div>
                          <div>
                            <label className="block text-xs uppercase tracking-wider text-gray-600 mb-1.5 font-semibold">
                              Landmark <span className="text-gray-400 font-normal">(Optional)</span>
                            </label>
                            <input
                              type="text"
                              value={landmark}
                              onChange={(e) => setLandmark(e.target.value)}
                              className="w-full bg-gray-50 border border-gray-200 focus:border-black rounded-xl p-3 text-sm text-gray-900 transition-colors outline-none"
                              placeholder="Nearby Mosque, Park, School..."
                            />
                          </div>
                        </div>

                        {/* City, State, PIN Code */}
                        <div className="grid grid-cols-3 gap-2.5">
                          <div>
                            <label className="block text-xs uppercase tracking-wider text-gray-600 mb-1.5 font-semibold">
                              City <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="text"
                              value={city}
                              onChange={(e) => setCity(e.target.value)}
                              className={`w-full bg-gray-50 border ${formErrors.city ? "border-red-300 focus:border-red-500" : "border-gray-200 focus:border-black"} rounded-xl p-3 text-xs text-gray-900 transition-colors outline-none`}
                              placeholder="Bangalore"
                            />
                            {formErrors.city && (
                              <p className="text-red-500 text-[11px] mt-1">
                                {formErrors.city}
                              </p>
                            )}
                          </div>
                          <div>
                            <label className="block text-xs uppercase tracking-wider text-gray-600 mb-1.5 font-semibold">
                              State <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="text"
                              value={state}
                              onChange={(e) => setState(e.target.value)}
                              className={`w-full bg-gray-50 border ${formErrors.state ? "border-red-300 focus:border-red-500" : "border-gray-200 focus:border-black"} rounded-xl p-3 text-xs text-gray-900 transition-colors outline-none`}
                              placeholder="Karnataka"
                            />
                            {formErrors.state && (
                              <p className="text-red-500 text-[11px] mt-1">
                                {formErrors.state}
                              </p>
                            )}
                          </div>
                          <div>
                            <label className="block text-xs uppercase tracking-wider text-gray-600 mb-1.5 font-semibold">
                              PIN Code <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="text"
                              value={pincode}
                              onChange={(e) =>
                                setPincode(e.target.value.slice(0, 12))
                              }
                              className={`w-full bg-gray-50 border ${formErrors.pincode ? "border-red-300 focus:border-red-500" : "border-gray-200 focus:border-black"} rounded-xl p-3 text-xs font-mono text-gray-900 transition-colors outline-none`}
                              placeholder="560005"
                            />
                            {formErrors.pincode && (
                              <p className="text-red-500 text-[11px] mt-1">
                                {formErrors.pincode}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Address Type & Delivery Instructions */}
                        <div className="space-y-3 pt-1">
                          <div>
                            <label className="block text-xs uppercase tracking-wider text-gray-600 mb-1.5 font-semibold">
                              Address Type
                            </label>
                            <div className="grid grid-cols-3 gap-2">
                              {(["Home", "Work", "Other"] as const).map((type) => (
                                <button
                                  key={type}
                                  type="button"
                                  onClick={() => setAddressType(type)}
                                  className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-colors cursor-pointer ${
                                    addressType === type
                                      ? "bg-[#1C1917] text-white border-[#1C1917]"
                                      : "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100"
                                  }`}
                                >
                                  {type}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div>
                            <label className="block text-xs uppercase tracking-wider text-gray-600 mb-1.5 font-semibold">
                              Delivery Instructions <span className="text-gray-400 font-normal">(Optional)</span>
                            </label>
                            <input
                              type="text"
                              value={deliveryInstructions}
                              onChange={(e) => setDeliveryInstructions(e.target.value)}
                              className="w-full bg-gray-50 border border-gray-200 focus:border-black rounded-xl p-3 text-xs text-gray-900 transition-colors outline-none"
                              placeholder="e.g. Ring doorbell, leave with security, call on arrival"
                            />
                          </div>
                        </div>
                      </div>
                    </section>

                    {/* Payment Method (Shown when not in WhatsApp-only mode, or user can switch) */}
                    {!isWhatsAppCheckoutMode && (
                      <section className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-5">
                        <div className="flex items-center justify-between border-b border-gray-100 pb-3.5">
                          <div className="flex items-center gap-2 text-gray-900">
                            <CreditCard className="w-5 h-5 text-emerald-600" />
                            <h3 className="font-serif text-lg font-semibold">
                              Select Checkout Mode
                            </h3>
                          </div>
                          <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full flex items-center gap-1.5">
                            <PremiumShieldMark className="w-3.5 h-3.5 shrink-0" variant="emerald" />
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
                          <div className="bg-white p-2.5 rounded-lg border border-gray-100 shadow-2xs space-y-1.5">
                            <span className="text-[10px] uppercase font-bold text-blue-700 flex items-center gap-1">
                              <Zap className="w-3 h-3 text-blue-600 fill-blue-100" />{" "}
                              Instant UPI
                            </span>
                            <p className="text-[11px] font-semibold text-gray-900 leading-tight">
                              Fast UPI QR &amp; Apps
                            </p>
                            <div className="flex items-center gap-2.5 pt-0.5">
                              <GooglePayIcon className="h-3.5 w-auto" />
                              <PhonePeIcon className="h-3.5 w-auto" />
                              <PaytmIcon className="h-3 w-auto" />
                              <UpiOfficialIcon className="h-3.5 w-auto" />
                            </div>
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
                                <span className="text-xs text-gray-500 block mb-1.5">
                                  Pay securely via Cards, NetBanking, UPI or Wallets
                                </span>
                                <div className="flex flex-wrap items-center gap-3 pt-0.5">
                                  <GooglePayIcon className="h-3.5 w-auto" />
                                  <PhonePeIcon className="h-3.5 w-auto" />
                                  <PaytmIcon className="h-3 w-auto" />
                                  <UpiOfficialIcon className="h-3.5 w-auto" />
                                  <VisaIcon className="h-3 w-auto" />
                                  <MastercardIcon className="h-3.5 w-auto" />
                                  <RuPayIcon className="h-3 w-auto" />
                                </div>
                              </div>
                            </div>
                            <PremiumShieldMark className="w-5 h-5 shrink-0" variant="emerald" />
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
                    )}
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

                {/* WHATSAPP HANDOFF STEP */}
                {step === "whatsapp_confirm" && (
                  <motion.div key="whatsapp_confirm" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="p-8 flex flex-col items-center justify-center text-center min-h-full space-y-5">
                    <div className="w-24 h-24 bg-green-50 rounded-full flex items-center justify-center text-green-600 shadow-sm border border-green-100"><MessageCircle className="w-12 h-12" strokeWidth={2.5} /></div>
                    <h2 className="text-3xl font-serif text-gray-900">Order Reference Created</h2>
                    <p className="text-gray-500 leading-relaxed max-w-sm text-sm">
                      Continue in WhatsApp to send your prefilled order message to JIYOO. Your order status will remain <span className="font-semibold text-gray-700">Awaiting WhatsApp Confirmation</span> until our team receives your message.
                    </p>
                    {!priceVerifiedState && (
                      <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 max-w-xs">
                        Live server price verification is pending; JIYOO will confirm final price &amp; availability on WhatsApp.
                      </p>
                    )}
                    {pendingOrderId && <p className="font-mono text-xs font-bold text-stone-700">Order #{pendingOrderId}</p>}
                    <div className="w-full max-w-xs space-y-3 pt-2">
                      {generatedWhatsAppUrl && (
                        <a
                          href={generatedWhatsAppUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full py-3.5 bg-emerald-600 text-white text-xs font-semibold tracking-wider uppercase hover:bg-emerald-700 transition-colors rounded-xl flex items-center justify-center gap-2 shadow-sm"
                        >
                          <MessageCircle className="w-4 h-4" /> Open WhatsApp
                        </a>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setStep("cart");
                          onClose();
                        }}
                        className="w-full py-3.5 bg-gray-100 text-gray-700 text-xs font-semibold tracking-wider uppercase hover:bg-gray-200 transition-colors rounded-xl"
                      >
                        Keep Bag &amp; Close
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          clearCart();
                          setStep("cart");
                          onClose();
                        }}
                        className="w-full py-2.5 text-gray-400 hover:text-gray-700 text-[11px] font-medium uppercase tracking-wider transition-colors"
                      >
                        Clear Bag &amp; Close
                      </button>
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

                {/* Order Summary & Desktop Checkout Column (also scrolls naturally at the bottom on Mobile) */}
                {step !== "success" && step !== "whatsapp_confirm" && step !== "upi_qr" && items.length > 0 && (
                  <div className="mt-6 lg:mt-0 lg:col-span-5 lg:sticky lg:top-6">
                    <div className="bg-white border border-[#E7E3DA] rounded-2xl p-5 sm:p-6 shadow-sm">
                      <div className="space-y-3 mb-5">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] uppercase tracking-wider font-bold text-stone-500">
                            Order Summary ({cartCount} {cartCount === 1 ? "item" : "items"})
                          </span>
                          <button
                            type="button"
                            onClick={() => setShowPriceBreakdown((v) => !v)}
                            className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 cursor-pointer flex items-center gap-1"
                          >
                            {showPriceBreakdown ? "Hide details" : "Show details"}
                          </button>
                        </div>
                        {showPriceBreakdown && (
                          <div className="space-y-3 pt-1">
                            {/* Selected Items Details List */}
                            <div className="max-h-48 overflow-y-auto overscroll-contain pr-1 space-y-2 border border-stone-100 rounded-xl p-2.5 bg-[#FAF9F5]">
                              {items.map((item) => {
                                const unitPrice = getValidPrice(item);
                                const lineTotal = unitPrice * item.quantity;
                                return (
                                  <div
                                    key={item.id}
                                    className="flex items-center justify-between gap-2.5 text-xs bg-white p-2 rounded-lg border border-stone-100"
                                  >
                                    <div className="flex items-center gap-2 min-w-0">
                                      {item.image && (
                                        <img
                                          src={getOptimizedImageUrl(item.image, 80, 75)}
                                          alt={item.name}
                                          className="w-8 h-8 rounded-md object-contain bg-white border border-stone-100 shrink-0"
                                        />
                                      )}
                                      <div className="min-w-0">
                                        <p className="font-semibold text-stone-900 truncate">
                                          {item.name}
                                        </p>
                                        <p className="text-[11px] text-stone-500">
                                          Qty: {item.quantity} × ₹{unitPrice}
                                          {(item as any).selectedWeight
                                            ? ` · ${(item as any).selectedWeight}`
                                            : ""}
                                        </p>
                                      </div>
                                    </div>
                                    <span className="font-bold text-stone-900 shrink-0">
                                      ₹{lineTotal}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>

                            {/* Price Breakdown */}
                            <div className="space-y-2 pt-1">
                              <div className="flex justify-between text-stone-600 text-sm">
                                <span>Subtotal</span>
                                <span>₹{cartTotal}</span>
                              </div>
                              {isPromoApplied && (
                                <div className="flex justify-between text-emerald-600 text-sm font-medium">
                                  <span>
                                    Coupon Discount
                                    {appliedCoupon?.code ? ` (${appliedCoupon.code})` : ""}
                                  </span>
                                  <span>-₹{discountAmount}</span>
                                </div>
                              )}
                              <div className="flex justify-between items-center text-stone-600 text-sm">
                                <span className="inline-flex items-center gap-1.5">
                                  <RealisticDeliveryScooter className="w-5 h-3.5 shrink-0" />
                                  <span>Delivery Fee</span>
                                </span>
                                {effectiveDeliveryFee === 0 ? (
                                  <span className="text-emerald-600 font-medium">Free</span>
                                ) : (
                                  <span className="font-semibold text-stone-900">
                                    ₹{effectiveDeliveryFee}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                        <div className="pt-3 border-t border-stone-100 flex justify-between text-stone-900 font-medium text-lg">
                          <span>Grand Total</span>
                          <span className="font-bold text-stone-900">
                            ₹{grandTotal}
                          </span>
                        </div>
                      </div>

                      {/* Desktop Action Buttons (hidden on mobile because mobile has compact sticky bar below) */}
                      <div className="hidden lg:block">
                        {step === "cart" ? (
                          <div className="space-y-3">
                            <button
                              type="button"
                              onClick={() => { if (requireCheckoutAuth()) setStep("checkout"); }}
                              className="group relative flex w-full h-[52px] text-[11px] font-bold uppercase tracking-[0.15em] text-[#FAF9F5] bg-[#1C1917] transition-all duration-300 cursor-pointer rounded-full overflow-hidden shadow-[0_5px_15px_-5px_rgba(28,25,23,0.3)] hover:bg-[#292524] active:scale-[0.98]"
                            >
                              <span className="relative z-10 flex items-center justify-center gap-2 w-full h-full">
                                Checkout (Online / COD)
                                <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
                              </span>
                            </button>
                            <button
                              type="button"
                              onClick={triggerWhatsAppOrder}
                              className="group relative flex w-full h-[52px] text-[11px] font-bold uppercase tracking-[0.15em] text-white bg-emerald-600 transition-all duration-300 cursor-pointer rounded-full overflow-hidden shadow-[0_5px_15px_-5px_rgba(5,150,105,0.3)] hover:bg-emerald-700 active:scale-[0.98]"
                            >
                              <span className="relative z-10 flex items-center justify-center gap-2 w-full h-full">
                                <MessageCircle className="w-4 h-4" />
                                Order via WhatsApp
                              </span>
                            </button>
                          </div>
                        ) : isWhatsAppCheckoutMode ? (
                          <div className="space-y-2.5">
                            <button
                              type="button"
                              onClick={triggerWhatsAppOrder}
                              disabled={isProcessing}
                              className="group relative flex w-full h-[52px] text-[11px] font-bold uppercase tracking-[0.15em] text-white bg-emerald-600 transition-all duration-300 cursor-pointer rounded-full overflow-hidden shadow-[0_5px_15px_-5px_rgba(5,150,105,0.35)] hover:bg-emerald-700 active:scale-[0.98] disabled:opacity-50"
                            >
                              <span className="relative z-10 flex items-center justify-center gap-2 w-full h-full">
                                <MessageCircle className="w-4 h-4" />
                                {isProcessing ? "Validating Order..." : `Proceed to WhatsApp (₹${grandTotal})`}
                              </span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (requireCheckoutAuth()) {
                                  setIsWhatsAppCheckoutMode(false);
                                }
                              }}
                              className="w-full py-2 text-[11px] font-semibold text-stone-500 hover:text-[#1C1917] transition-colors cursor-pointer"
                            >
                              Prefer Online Payment or COD? Sign in here
                            </button>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            <button
                              type="button"
                              onClick={handleCheckout}
                              disabled={isProcessing}
                              className="group relative flex w-full h-[52px] text-[11px] font-bold uppercase tracking-[0.15em] text-[#FAF9F5] bg-[#1C1917] transition-all duration-300 cursor-pointer rounded-full overflow-hidden shadow-[0_5px_15px_-5px_rgba(28,25,23,0.3)] hover:bg-[#292524] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                            >
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
                                    <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
                                  </>
                                )}
                              </span>
                            </button>
                            <button
                              type="button"
                              onClick={triggerWhatsAppOrder}
                              className="group relative flex w-full h-[52px] text-[11px] font-bold uppercase tracking-[0.15em] text-[#1C1917] bg-transparent border border-[#1C1917] transition-all duration-300 cursor-pointer rounded-full overflow-hidden hover:bg-stone-100 active:scale-[0.98]"
                            >
                              <span className="relative z-10 flex items-center justify-center gap-2 w-full h-full">
                                <MessageCircle className="w-4 h-4" />
                                Instant Order via WhatsApp
                              </span>
                            </button>
                          </div>
                        )}
                      </div>

                      <div className="mt-5 pt-4 border-t border-stone-100 flex flex-col items-center justify-center gap-2.5">
                        <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-emerald-800 font-bold">
                          <PremiumShieldMark className="w-3.5 h-3.5 shrink-0" variant="emerald" /> 100% Secure Checkout
                        </div>
                        <div className="flex flex-wrap items-center justify-center gap-3.5 py-0.5">
                          <GooglePayIcon className="h-4 w-auto" />
                          <PhonePeIcon className="h-4 w-auto" />
                          <PaytmIcon className="h-3.5 w-auto" />
                          <UpiOfficialIcon className="h-4 w-auto" />
                          <span className="h-4 w-[1px] bg-stone-300" aria-hidden="true" />
                          <VisaIcon className="h-3.5 w-auto" />
                          <MastercardIcon className="h-4 w-auto" />
                          <RuPayIcon className="h-3.5 w-auto" />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Compact Mobile Sticky Action Bar (< 15% viewport height) */}
            {step !== "success" && step !== "whatsapp_confirm" && step !== "upi_qr" && items.length > 0 && (
              <div className="lg:hidden shrink-0 bg-white border-t border-[#E7E3DA] px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] shadow-[0_-8px_24px_rgba(0,0,0,0.06)] z-20">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-[11px] uppercase tracking-wider font-semibold text-stone-500">
                      Total
                    </span>
                    <span className="text-base font-bold text-[#1C1917]">
                      ₹{grandTotal}
                    </span>
                    {effectiveDeliveryFee === 0 && (
                      <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                        Free Delivery
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-stone-500">
                    {cartCount} {cartCount === 1 ? "item" : "items"}
                  </span>
                </div>

                {step === "cart" ? (
                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => { if (requireCheckoutAuth()) setStep("checkout"); }}
                      className="flex items-center justify-center gap-1.5 h-11 px-3 text-[11px] font-bold uppercase tracking-wider text-[#FAF9F5] bg-[#1C1917] rounded-full shadow-sm active:scale-[0.98] cursor-pointer"
                    >
                      <span>Checkout</span>
                      <ArrowRight className="w-3.5 h-3.5 shrink-0" />
                    </button>
                    <button
                      type="button"
                      onClick={triggerWhatsAppOrder}
                      className="flex items-center justify-center gap-1.5 h-11 px-3 text-[11px] font-bold uppercase tracking-wider text-white bg-emerald-600 rounded-full shadow-sm active:scale-[0.98] cursor-pointer"
                    >
                      <MessageCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>WhatsApp</span>
                    </button>
                  </div>
                ) : isWhatsAppCheckoutMode ? (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={triggerWhatsAppOrder}
                      disabled={isProcessing}
                      className="flex-1 flex items-center justify-center gap-2 h-11 px-4 text-[11px] font-bold uppercase tracking-wider text-white bg-emerald-600 rounded-full shadow-sm active:scale-[0.98] disabled:opacity-50 cursor-pointer"
                    >
                      <MessageCircle className="w-4 h-4 shrink-0" />
                      <span>{isProcessing ? "Validating..." : `WhatsApp Order (₹${grandTotal})`}</span>
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={handleCheckout}
                      disabled={isProcessing}
                      className="flex items-center justify-center gap-1.5 h-11 px-3 text-[11px] font-bold uppercase tracking-wider text-[#FAF9F5] bg-[#1C1917] rounded-full shadow-sm active:scale-[0.98] disabled:opacity-50 cursor-pointer"
                    >
                      <span>
                        {isProcessing
                          ? "Processing..."
                          : paymentMethod === "cod"
                            ? `COD ₹${grandTotal}`
                            : `Pay ₹${grandTotal}`}
                      </span>
                      <ArrowRight className="w-3.5 h-3.5 shrink-0" />
                    </button>
                    <button
                      type="button"
                      onClick={triggerWhatsAppOrder}
                      className="flex items-center justify-center gap-1.5 h-11 px-3 text-[11px] font-bold uppercase tracking-wider text-[#1C1917] bg-white border border-[#1C1917] rounded-full active:scale-[0.98] cursor-pointer"
                    >
                      <MessageCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>WhatsApp</span>
                    </button>
                  </div>
                )}
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
          populateStructuredFromRawAddress(newAddr, newPin);
          setFormErrors((prev) => ({
            ...prev,
            houseNo: undefined,
            street: undefined,
            area: undefined,
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
