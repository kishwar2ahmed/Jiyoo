import { motion, AnimatePresence } from "motion/react";
import { X, ShieldCheck } from "lucide-react";
import { useSettings } from "../../../contexts/SettingsContext";
import { useModalBackButton } from "../hooks/useModalBackButton";

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AboutModal({ isOpen, onClose }: AboutModalProps) {
  const { settings } = useSettings();
  useModalBackButton(isOpen, onClose);

  return (
    <AnimatePresence>
      {isOpen && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-brand-black/60 backdrop-blur-sm"
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-3xl bg-brand-white rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-brand-gray-200">
            <div className="flex items-center gap-3">
              <img
                src="/jiyoo.logo.jpeg"
                alt="JIYOO Logo"
                className="h-9 w-auto object-contain rounded-xl"
              />
              <h2 className="text-2xl font-serif font-bold text-brand-black">
                About {settings.storeName || "JIYOO"}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-brand-gray-500 hover:text-brand-black transition-colors rounded-full hover:bg-brand-gray-100 cursor-pointer"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 sm:p-8 overflow-y-auto custom-scrollbar flex-1 space-y-8">
            {/* Intro */}
            <section>
              <p className="text-brand-gray-600 leading-relaxed text-sm sm:text-base whitespace-pre-line">
                {settings.aboutUs?.introText || "JIYOO is an emerging online service provider connecting businesses and consumers with the finest fresh fruits, vegetables, meat, seafood, and other premium produce."}
              </p>
              {settings.aboutUs?.objectiveText && (
                <p className="text-brand-gray-600 leading-relaxed text-sm sm:text-base mt-4 whitespace-pre-line">
                  {settings.aboutUs.objectiveText}
                </p>
              )}
              {settings.aboutUs?.visionText && (
                <p className="text-brand-gray-600 leading-relaxed text-sm sm:text-base mt-4 whitespace-pre-line">
                  {settings.aboutUs.visionText}
                </p>
              )}
              {settings.aboutUs?.standardsText && (
                <p className="text-brand-gray-600 leading-relaxed text-sm sm:text-base mt-4 whitespace-pre-line">
                  {settings.aboutUs.standardsText}
                </p>
              )}
            </section>

            {/* Leadership & Contact */}
            <div className="grid sm:grid-cols-2 gap-8 border-t border-brand-gray-200 pt-8">
              <div>
                <h3 className="text-lg font-bold text-brand-black mb-4">
                  Leadership
                </h3>
                <div className="space-y-4">
                  {settings.aboutUs?.founderName && (
                    <div>
                      <p className="font-medium text-brand-black">{settings.aboutUs.founderName}</p>
                      <p className="text-xs text-brand-gray-500 uppercase tracking-wider">
                        {settings.aboutUs.founderRole || "Founder & CEO"}
                      </p>
                    </div>
                  )}
                  {settings.aboutUs?.mdName && (
                    <div>
                      <p className="font-medium text-brand-black">
                        {settings.aboutUs.mdName}
                      </p>
                      <p className="text-xs text-brand-gray-500 uppercase tracking-wider">
                        {settings.aboutUs.mdRole || "Managing Director"}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-bold text-brand-black mb-2">
                    Marketed By
                  </h3>
                  <p className="text-brand-gray-600 font-medium">{settings.aboutUs?.marketedBy || "SHAM'S™"}</p>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-brand-black mb-2">
                    Contact
                  </h3>
                  <p className="text-brand-gray-600 font-medium text-lg font-mono">
                    {settings.aboutUs?.contactPhone || settings.whatsappNumber || "+91 97393 91891"}
                  </p>
                </div>
              </div>
            </div>

            {/* Legal & Registrations */}
            <div className="border-t border-brand-gray-200 pt-8">
              <h3 className="text-lg font-bold text-brand-black mb-4 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-500" />
                Legal &amp; Registrations
              </h3>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="bg-brand-gray-50 rounded-xl p-4 border border-brand-gray-200">
                  <p className="text-xs text-brand-gray-500 uppercase tracking-wider mb-1">
                    FSSAI Registration No.
                  </p>
                  <p className="font-mono font-semibold text-brand-black text-sm">
                    21226112000732
                  </p>
                </div>
                <div className="bg-brand-gray-50 rounded-xl p-4 border border-brand-gray-200">
                  <p className="text-xs text-brand-gray-500 uppercase tracking-wider mb-1">
                    Udyam (MSME) Registration No.
                  </p>
                  <p className="font-mono font-semibold text-brand-black text-sm">
                    UDYAM-KR-19-0005999
                  </p>
                </div>
              </div>
              <p className="text-xs text-brand-gray-400 mt-3">
                {settings.storeName || "JIYOO"} is a registered food business operator under the Food Safety and Standards Authority of India (FSSAI), and a Udyam-registered Micro Enterprise under the Ministry of MSME, Government of India.
              </p>
            </div>
          </div>
        </motion.div>
      </div>
      )}
    </AnimatePresence>
  );
}
