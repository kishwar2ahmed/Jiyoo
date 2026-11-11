import React from 'react';

export function FssaiLogo({
  className = 'h-4 w-auto',
  variant = 'original',
}: {
  className?: string;
  variant?: 'original' | 'monochrome';
}) {
  return (
    <img
      src="/fssai-logo.svg"
      onError={(e) => {
        const target = e.currentTarget;
        if (!target.src.endsWith('/fssai.svg')) {
          target.src = '/fssai.svg';
        }
      }}
      alt="FSSAI Certified"
      className={`${className} object-contain select-none ${variant === 'monochrome' ? 'grayscale contrast-125' : ''}`}
      loading="lazy"
    />
  );
}
