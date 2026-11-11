import React, { useState, useEffect } from "react";
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
  QrCode,
  ShieldCheck,
} from "lucide-react";
import { useCart } from "../../../contexts/CartContext";
import { useSettings } from "../../../contexts/SettingsContext";
import { useToast } from "../../core/contexts/ToastContext";
import { useModalBackButton } from "../../core/hooks/useModalBackButton";
import { LocationPickerModal } from "../../core/components/LocationPickerModal";
import { PriceDisplay } from "../../core/components/PriceDisplay";
import { sanitizeWhatsAppNumber } from "../../../utils/whatsapp";
import { auth } from "../../../services/firebase";
import { getSupabaseAccessToken } from "../../../services/supabase";

const E164_PHONE_REGEX = /^\+?[1-9]\d{6,14}$/;

interface CartModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRequireAuth?: () => void;
}

export function CartModal({ isOpen, onClose, onRequireAuth }: CartModalProps) {
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
  const [houseNo, setHouseNo] = useState("");
  const [street, setStreet] = useState("");
  const [area, setArea] = useState("");
  const [landmark, setLandmark] = useState("");
  const [pincode, setPincode] = useState(user?.pincode || "");
  const [addressType, setAddressType] = useState<"Home" | "Work" | "Other">("Home");
  const [paymentMethod, setPaymentMethod] = useState<"upi_qr" | "cod" | "whatsapp">("upi_qr");
  const [utrNumber, setUtrNumber] = useState("");
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdOrderId, setCreatedOrderId] = useState<string | null>(null);
  const [locationPickerOpen, setLocationPickerOpen] = useState(false);

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
      if (!pincode && user.pincode) setPincode(user.pincode);
    }
  }, [user, name, phone, pincode]);

  const deliveryFee =
    settings.freeDeliveryThreshold > 0 && cartTotal >= settings.freeDeliveryThreshold
      ? 0
      : Number(settings.deliveryFee ?? 40);
  const grandTotal = Math.max(0, cartTotal + (items.length > 0 ? deliveryFee : 0));

  useEffect(() => {
    if (isOpen && step === "checkout" && paymentMethod === "upi_qr" && grandTotal > 0) {
      fetch(`/api/upi/qr?amount=${encodeURIComponent(grandTotal)}`)
        .then((r) => r.json())
        .then((d) => {
          if (d?.qrDataUrl) setQrDataUrl(d.qrDataUrl);
        })
        .catch(() => {});
    }
  }, [isOpen, step, paymentMethod, grandTotal]);

  const requireCheckoutAuth = () => {
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
        if (supaToken) headers.Authorization = `Bearer ${supaToken}`;
      }
    } catch {
      // Guest checkout allowed
    }
    return headers;
  };

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requireCheckoutAuth()) return;

    const cleanPhone = phone.replace(/[\s()-]/g, "");
    if (!E164_PHONE_REGEX.test(cleanPhone)) {
      showToast("Valid 10-digit or international phone number required.", "error");
      return;
    }

    if (!name.trim() || !houseNo.trim() || !area.trim() || !pincode.trim()) {
      showToast("Please complete your delivery address details.", "error");
      return;
    }

    if (paymentMethod === "upi_qr" && utrNumber.trim().length < 12) {
      showToast("Please enter the 12-digit UPI UTR reference number after scanning.", "error");
      return;
    }

    const fullAddress = [
      `[${addressType}]`,
      houseNo.trim(),
      street.trim(),
      area.trim(),
      landmark.trim() ? `Landmark: ${landmark.trim()}` : "",
      `PIN: ${pincode.trim()}`,
    ]
      .filter(Boolean)
      .join(", ");

    setIsSubmitting(true);
    try {
      const headers = await getCheckoutAuthHeaders();
      const endpoint =
        paymentMethod === "whatsapp" ? "/api/whatsapp/prepare-order" : "/api/orders/create";

      const res = await fetch(endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify({
          items: items.map((item) => ({
            id: item.id,
            name: item.name,
            quantity: item.quantity,
            price: item.numericPrice,
            image: item.image,
            selectedWeight: item.selectedWeight || item.unit,
            selectedCut: item.selectedCut,
          })),
          shippingDetails: {
            name: name.trim(),
            phone: cleanPhone,
            address: fullAddress,
            pincode: pincode.trim(),
            houseNo: houseNo.trim(),
            street: street.trim(),
            area: area.trim(),
            landmark: landmark.trim(),
            addressType,
          },
          paymentMethod,
          utrNumber: paymentMethod === "upi_qr" ? utrNumber.trim() : undefined,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        showToast(data.error || "Could not place order. Please check your details.", "error");
        return;
      }

      const orderId = data.orderId || data.id || "JIYOO-ORD";
      setCreatedOrderId(orderId);

      if (paymentMethod === "whatsapp") {
        const waNum = sanitizeWhatsAppNumber(settings.whatsappNumber);
        const summary = items
          .map((i) => `• ${i.name} (${i.unit || "1 pc"}) × ${i.quantity} = ₹${i.numericPrice * i.quantity}`)
          .join("\n");
        const msg = `Hi JIYOO Premium Products! I placed Order #${orderId}:\n\n${summary}\n\nTotal: ₹${grandTotal}\nName: ${name}\nPhone: ${cleanPhone}\nAddress: ${fullAddress}`;
        window.location.href = `https://wa.me/${waNum}?text=${encodeURIComponent(msg)}`;
      }

      clearCart();
      setStep("success");
      showToast("Order placed successfully!", "success");
    } catch (err: any) {
      showToast(err?.message || "Order submission failed.", "error");
    } finally {
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
                            {item.unit && (
                              <p className="text-xs text-brand-gray-500">{item.unit}</p>
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
                              onClick={() => updateQuantity(item.id, item.quantity - 1)}
                              className="p-1 text-brand-black hover:text-emerald-700"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <span className="text-xs font-bold w-5 text-center">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => updateQuantity(item.id, item.quantity + 1)}
                              className="p-1 text-brand-black hover:text-emerald-700"
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
                        className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:underline"
                      >
                        <MapPin className="w-3.5 h-3.5" />
                        Detect GPS Location
                      </button>
                    </div>

                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Full Name *"
                      className="w-full px-3.5 py-2.5 text-sm border border-[#E7E3DA] rounded-xl bg-[#FAF9F5]"
                    />
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="Mobile Number (e.g. +919739391891) *"
                      className="w-full px-3.5 py-2.5 text-sm border border-[#E7E3DA] rounded-xl bg-[#FAF9F5]"
                    />
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
                        value={pincode}
                        onChange={(e) => setPincode(e.target.value)}
                        placeholder="Postal / PIN Code *"
                        className="w-full px-3.5 py-2 text-sm border border-[#E7E3DA] rounded-xl bg-[#FAF9F5]"
                      />
                    </div>
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

                  {/* Payment Options */}
                  <div className="bg-white p-4 rounded-xl border border-[#E7E3DA] space-y-3">
                    <h3 className="text-sm font-bold text-brand-black">Payment Method</h3>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: "upi_qr", label: "UPI QR" },
                        { id: "cod", label: "Cash on Delivery" },
                        { id: "whatsapp", label: "WhatsApp Order" },
                      ].map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => setPaymentMethod(opt.id as any)}
                          className={`py-2 px-2 rounded-xl text-xs font-semibold border transition-colors ${
                            paymentMethod === opt.id
                              ? "bg-emerald-700 text-white border-emerald-700"
                              : "bg-[#FAF9F5] text-brand-black border-[#E7E3DA]"
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>

                    {paymentMethod === "upi_qr" && (
                      <div className="p-3 bg-[#FAF9F5] rounded-xl border border-[#E7E3DA] space-y-3 text-center">
                        {qrDataUrl ? (
                          <img
                            src={qrDataUrl}
                            alt="UPI QR Code"
                            className="w-40 h-40 mx-auto rounded-lg border border-[#E7E3DA] bg-white p-2"
                          />
                        ) : (
                          <div className="w-40 h-40 mx-auto flex items-center justify-center bg-white rounded-lg border border-[#E7E3DA]">
                            <QrCode className="w-10 h-10 text-brand-gray-400" />
                          </div>
                        )}
                        <input
                          type="text"
                          value={utrNumber}
                          onChange={(e) => setUtrNumber(e.target.value.replace(/\D/g, "").slice(0, 12))}
                          placeholder="Enter 12-digit UTR after payment"
                          className="w-full px-3 py-2 text-xs font-mono border border-[#E7E3DA] rounded-lg bg-white text-center"
                        />
                      </div>
                    )}
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
                    Order Reference:{" "}
                    <span className="font-mono font-bold text-brand-black">
                      #{createdOrderId}
                    </span>
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setStep("cart");
                      onClose();
                    }}
                    className="px-6 py-2.5 rounded-xl bg-brand-black text-white text-sm font-semibold"
                  >
                    Continue Shopping
                  </button>
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
                        Processing Order...
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4" />
                        Confirm Order • ₹{grandTotal.toLocaleString()}
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
