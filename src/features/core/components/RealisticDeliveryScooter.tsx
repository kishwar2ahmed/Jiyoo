import React from 'react';

export function RealisticDeliveryScooter({ className = 'w-6 h-5 shrink-0' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 52"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* Speed lines */}
      <path d="M2 34H10" stroke="#059669" strokeWidth="2.2" strokeLinecap="round" opacity="0.55" />
      <path d="M5 26H12" stroke="#059669" strokeWidth="2" strokeLinecap="round" opacity="0.4" />
      {/* Delivery box */}
      <rect x="11" y="14" width="15" height="13" rx="2.5" fill="#047857" stroke="#064E3B" strokeWidth="1.5" />
      <path d="M14 20.5H23" stroke="#ECFDF5" strokeWidth="1.6" strokeLinecap="round" />
      {/* Scooter body */}
      <path
        d="M16 28H35L40 16H46L43 29L51 32C53.5 33 55 35.5 55 38H41L37 34H22L16 38V28Z"
        fill="#10B981"
        stroke="#065F46"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      {/* Seat */}
      <rect x="24" y="24" width="11" height="4" rx="2" fill="#1C1917" />
      {/* Handlebar & headlight */}
      <path d="M39 16H48" stroke="#1C1917" strokeWidth="2.4" strokeLinecap="round" />
      <circle cx="48.5" cy="17" r="2.5" fill="#FBBF24" stroke="#1C1917" strokeWidth="1.2" />
      {/* Wheels */}
      <circle cx="21" cy="39" r="6.5" fill="#1C1917" />
      <circle cx="21" cy="39" r="3" fill="#FAF9F5" />
      <circle cx="48" cy="39" r="6.5" fill="#1C1917" />
      <circle cx="48" cy="39" r="3" fill="#FAF9F5" />
    </svg>
  );
}
