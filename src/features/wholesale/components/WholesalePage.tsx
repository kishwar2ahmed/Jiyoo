import { ArrowLeft } from "lucide-react";

export function WholesalePage({
  onBackToRetail,
}: {
  onBackToRetail: () => void;
}) {
  return (
    <section className="min-h-[70vh] bg-[#FAF9F5] text-[#1C1917] flex flex-col">
      <div className="max-w-[1400px] w-full mx-auto px-4 sm:px-6 lg:px-12 py-6 sm:py-8">
        <button
          type="button"
          onClick={onBackToRetail}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#1C1917] text-[#FAF9F5] hover:bg-[#292524] text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Retail Store</span>
        </button>
      </div>

      <div className="flex-1 flex items-center justify-center px-4 py-16 text-center">
        <div>
          <h1 className="font-serif-luxury text-2xl sm:text-4xl font-semibold text-[#1C1917]">
            Wholesale
          </h1>
          <p className="text-xs sm:text-sm text-[#78716C] mt-2">
            Wholesale catalog coming soon.
          </p>
        </div>
      </div>
    </section>
  );
}
