import React from "react";
import { ShieldCheck, Award, Lock, Truck } from "lucide-react";

interface TrustStripProps {
  variant?: "storefront" | "compact";
  className?: string;
}

export const TrustStrip: React.FC<TrustStripProps> = ({
  variant = "storefront",
  className = "",
}) => {
  const badges = [
    {
      icon: ShieldCheck,
      title: "100% Pure & Authentic",
      subtitle: "RO-Water Cleaned & Farm Fresh",
    },
    {
      icon: Award,
      title: "FSSAI Certified Quality",
      subtitle: "Lic. No. 21226112000732",
    },
    {
      icon: Lock,
      title: "Secure UPI / Card / NetBanking",
      subtitle: "PCI-DSS & NPCI Verified Checkout",
    },
    {
      icon: Truck,
      title: "Pan-India Express Delivery",
      subtitle: "60-Min Bengaluru & Cold-Chain B2B",
    },
  ];

  if (variant === "compact") {
    return (
      <div
        aria-label="JIYOO E-Commerce Quality & Payment Guarantees"
        className={`grid grid-cols-2 gap-2.5 pt-4 border-t border-brand-gray-100 ${className}`}
      >
        {badges.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.title}
              className="flex items-start gap-2 rounded-xl bg-stone-50/90 border border-stone-200/70 px-3 py-2"
            >
              <Icon className="w-4 h-4 text-[#8A5A36] shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="text-[11px] font-semibold text-stone-900 leading-tight">
                  {item.title}
                </p>
                <p className="text-[10px] text-stone-500 leading-tight mt-0.5 truncate">
                  {item.subtitle}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <section
      aria-label="Indian E-Commerce Trust & Compliance Guarantees"
      className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4 mb-6 ${className}`}
    >
      <div className="rounded-2xl bg-[#FAF8F5] border border-[#E7E3DA] shadow-[0_8px_24px_-12px_rgba(28,25,23,0.06)] px-4 py-3.5 sm:px-6 sm:py-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-6">
          {badges.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div
                key={item.title}
                className={`flex items-start sm:items-center gap-3 ${
                  idx > 0 ? "lg:border-l lg:border-[#E7E3DA] lg:pl-6" : ""
                }`}
              >
                <div className="w-9 h-9 rounded-xl bg-white border border-[#E7E3DA] flex items-center justify-center text-[#8A5A36] shrink-0 shadow-2xs">
                  <Icon className="w-4 h-4" strokeWidth={1.8} />
                </div>
                <div className="min-w-0">
                  <h2 className="text-xs sm:text-[13px] font-semibold text-[#1C1917] leading-snug">
                    {item.title}
                  </h2>
                  <p className="text-[10px] sm:text-[11px] text-[#78716C] font-mono leading-tight mt-0.5 truncate">
                    {item.subtitle}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
