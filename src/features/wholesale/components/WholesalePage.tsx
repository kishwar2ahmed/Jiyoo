import React, { useState } from "react";
import { motion } from "motion/react";
import {
  ArrowLeft,
  Truck,
  MapPin,
  MessageCircle,
  CheckCircle2,
  Package,
  ShieldCheck,
  Clock,
} from "lucide-react";
import { useSettings } from "../../../contexts/SettingsContext";
import { sanitizeWhatsAppNumber } from "../../../utils/whatsapp";

const EASE_OUT_EXPO: [number, number, number, number] = [0.16, 1, 0.3, 1];

export function WholesalePage({
  onBackToRetail,
}: {
  onBackToRetail: () => void;
}) {
  const { settings } = useSettings();

  const [pincodeInput, setPincodeInput] = useState<string>("");
  const [pincodeStatus, setPincodeStatus] = useState<{
    checked: boolean;
    serviceable: boolean;
    message: string;
    etaDays?: string;
  } | null>(null);
  const [checkingPin, setCheckingPin] = useState(false);

  const handleCheckWholesalePincode = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = pincodeInput.trim().replace(/\*+$/, "").trim();
    if (!/^[1-9]\d{5}$/.test(clean)) {
      setPincodeStatus({
        checked: true,
        serviceable: false,
        message: "Please enter a valid 6-digit Indian PIN code (e.g., 560084, 400001, 110001).",
      });
      return;
    }
    setCheckingPin(true);
    try {
      const res = await fetch(
        `/api/delivery/check-pincode?mode=wholesale&pincode=${encodeURIComponent(clean)}`
      );
      const data = await res.json().catch(() => ({}));
      if (data.serviceable) {
        setPincodeStatus({
          checked: true,
          serviceable: true,
          message: `Pan-India Wholesale Delivery available to PIN ${clean} (${data.zoneLabel || "All India Zone"}).`,
          etaDays: data.etaDays || "2-5 business days",
        });
      } else {
        setPincodeStatus({
          checked: true,
          serviceable: false,
          message: data.message || "Wholesale delivery is currently unavailable for this PIN code.",
        });
      }
    } catch {
      setPincodeStatus({
        checked: true,
        serviceable: true,
        message: `Pan-India Wholesale Delivery available to PIN ${clean} (All India Network).`,
        etaDays: "2-5 business days",
      });
    } finally {
      setCheckingPin(false);
    }
  };

  const whatsappB2BUrl = `https://wa.me/${sanitizeWhatsAppNumber(
    settings?.whatsappNumber
  )}?text=${encodeURIComponent(
    "Hello JIYOO Team! I would like to register interest for the upcoming Pan-India Wholesale & B2B catalog."
  )}`;

  return (
    <section className="min-h-[80vh] bg-[#FAF9F5] text-[#1C1917] flex flex-col pb-16">
      <div className="max-w-[1400px] w-full mx-auto px-4 sm:px-6 lg:px-12 py-6 sm:py-8 space-y-8">
        {/* Top bar */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <button
            type="button"
            onClick={onBackToRetail}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#1C1917] text-[#FAF9F5] hover:bg-[#292524] text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Retail Store</span>
          </button>

          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-semibold">
            <Truck className="w-4 h-4 text-emerald-700" />
            <span>Pan-India Wholesale Network — All 28 States &amp; 8 UTs</span>
          </div>
        </div>

        {/* Hero Banner & All-India Pincode Checker */}
        <div className="bg-white rounded-3xl border border-[#E7E3DA] p-6 sm:p-10 shadow-xs grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-7 space-y-4">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.2em] text-emerald-800">
              <ShieldCheck className="w-4 h-4 text-emerald-600" /> JIYOO B2B &amp; Bulk Supply
            </span>
            <h1 className="font-serif-luxury text-2xl sm:text-4xl lg:text-5xl font-semibold text-[#1C1917] leading-tight">
              Wholesale Supply Across All of India
            </h1>
            <p className="text-sm sm:text-base text-[#57534E] leading-relaxed max-w-2xl">
              Direct farm-to-business &amp; importer-grade supply for hotels, restaurants, cafes (HoReCa), supermarkets, and bulk buyers across India.
            </p>
            <div className="flex flex-wrap gap-3 pt-1 text-xs text-[#57534E]">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#FAF9F5] border border-[#E7E3DA]">
                <Package className="w-3.5 h-3.5 text-[#1C1917]" /> Cold-Chain &amp; Air Cargo Dispatch
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#FAF9F5] border border-[#E7E3DA]">
                <MessageCircle className="w-3.5 h-3.5 text-emerald-600" /> Instant WhatsApp B2B Desk
              </span>
            </div>
          </div>

          {/* All-India PIN Code Verification Box */}
          <div className="lg:col-span-5 bg-[#FAF9F5] rounded-2xl p-5 sm:p-6 border border-[#E7E3DA] space-y-4">
            <div className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-emerald-700" />
              <h2 className="font-serif text-lg font-semibold text-[#1C1917]">
                Check Pan-India Wholesale Delivery
              </h2>
            </div>
            <p className="text-xs text-[#78716C]">
              Enter any 6-digit PIN code in India to check wholesale dispatch availability &amp; estimated transit time.
            </p>
            <form onSubmit={handleCheckWholesalePincode} className="flex gap-2">
              <input
                type="text"
                value={pincodeInput}
                onChange={(e) => setPincodeInput(e.target.value.slice(0, 7))}
                placeholder="Enter 6-digit India PIN (e.g. 400001)"
                className="flex-1 bg-white border border-[#DCD6CA] focus:border-[#1C1917] rounded-xl px-3.5 py-2.5 text-sm font-mono outline-none"
              />
              <button
                type="submit"
                disabled={checkingPin}
                className="px-4 py-2.5 bg-[#1C1917] hover:bg-black text-[#FAF9F5] rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer transition-colors disabled:opacity-50 whitespace-nowrap shrink-0"
              >
                {checkingPin ? "Checking..." : "Check PIN"}
              </button>
            </form>
            {pincodeStatus && (
              <div
                className={`p-3 rounded-xl border text-xs flex items-start gap-2 ${
                  pincodeStatus.serviceable
                    ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                    : "bg-red-50 border-red-200 text-red-700"
                }`}
              >
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">{pincodeStatus.message}</p>
                  {pincodeStatus.etaDays && (
                    <p className="text-[11px] opacity-80 mt-0.5">
                      Estimated Transit: {pincodeStatus.etaDays}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Launching Soon Showcase (Wholesale Products Removed) */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: EASE_OUT_EXPO }}
          className="bg-white rounded-3xl border border-[#E7E3DA] px-6 py-16 sm:py-24 text-center shadow-xs flex flex-col items-center justify-center space-y-6"
        >
          <div className="w-16 h-16 rounded-2xl bg-[#FAF9F5] border border-[#E7E3DA] flex items-center justify-center text-[#1C1917] shadow-2xs">
            <Clock className="w-7 h-7 text-emerald-700" />
          </div>

          <div className="space-y-3 max-w-xl mx-auto">
            <span className="text-[11px] font-bold uppercase tracking-[0.25em] text-emerald-800 block">
              JIYOO B2B Wholesale Catalog
            </span>
            <h2 className="font-serif-luxury text-3xl sm:text-5xl font-bold text-[#1C1917] tracking-tight">
              Launching Soon ‼️
            </h2>
            <p className="text-sm sm:text-base text-[#57534E] leading-relaxed">
              Our dedicated bulk &amp; HoReCa wholesale catalog is being curated for direct Pan-India dispatch. Connect with our B2B desk on WhatsApp for early trade enquiries or return to our live Retail store.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={onBackToRetail}
              className="px-6 py-3.5 rounded-full bg-[#1C1917] hover:bg-black text-[#FAF9F5] text-xs font-bold uppercase tracking-[0.15em] transition-all cursor-pointer whitespace-nowrap shrink-0"
            >
              Browse Retail Store
            </button>
            <a
              href={whatsappB2BUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-6 py-3.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold uppercase tracking-[0.15em] transition-all inline-flex items-center gap-2 whitespace-nowrap shrink-0"
            >
              <MessageCircle className="w-4 h-4" />
              <span>Enquire on WhatsApp</span>
            </a>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

