import React, { useState } from 'react';
import { DeveloperPresentation } from '../features/core/components/DeveloperPresentation';

export function DeveloperFooter() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="group w-full sm:w-auto inline-flex items-center justify-center gap-3 px-4 py-2.5 rounded-2xl bg-[#1C1917]/[0.03] hover:bg-[#1C1917]/[0.06] border border-[#1C1917]/10 transition-all cursor-pointer"
      >
        <div className="text-left">
          <h2 className="text-xs font-semibold text-[#1C1917] flex items-center gap-1.5">
            Designed with <span role="img" aria-label="love">❤️</span>{' '}
            <span className="underline decoration-[#D4AF37]/60 underline-offset-2">
              by Kishwar Ahmed
            </span>
          </h2>
          <p className="text-[10px] text-[#78716C] tracking-wide">
            Premium Digital Experiences
          </p>
        </div>
      </button>
      <DeveloperPresentation isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}
