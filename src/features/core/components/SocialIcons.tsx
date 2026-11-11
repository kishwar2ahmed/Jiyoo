import React from 'react';

export const OFFICIAL_INSTAGRAM_URL =
  'https://www.instagram.com/shamsjiyoo2026?exln=aG43cXdnZmgwZDRu';

export function InstaBlueTickIcon({ className = 'w-4 h-4 shrink-0' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M12 2L14.4 4.2L17.6 3.7L18.7 6.8L21.8 7.9L21.3 11.1L23.5 13.5L21.3 15.9L21.8 19.1L18.7 20.2L17.6 23.3L14.4 22.8L12 25L9.6 22.8L6.4 23.3L5.3 20.2L2.2 19.1L2.7 15.9L0.5 13.5L2.7 11.1L2.2 7.9L5.3 6.8L6.4 3.7L9.6 4.2L12 2Z"
        fill="#0095F6"
      />
      <path
        d="M8.5 13.2L10.9 15.6L15.8 10.5"
        stroke="#FFFFFF"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function InstagramIcon({ className = 'w-4 h-4 shrink-0' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  );
}

export function WhatsAppIcon({ className = 'w-4 h-4 shrink-0' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    </svg>
  );
}

export function PhoneCallIcon({ className = 'w-4 h-4 shrink-0' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  );
}

export function EmailEnvelopeIcon({ className = 'w-4 h-4 shrink-0' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <rect width="20" height="16" x="2" y="4" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  );
}

export interface SocialLinkItem {
  id: string;
  label: string;
  handle: string;
  href: string;
  accentColor: string;
  icon: (props: { className?: string }) => React.ReactNode;
}

export const SOCIAL_LINKS: SocialLinkItem[] = [
  {
    id: 'whatsapp',
    label: 'WhatsApp',
    handle: '+91 97393 91891',
    href: 'https://wa.me/919739391891',
    accentColor: '#059669',
    icon: (props) => <WhatsAppIcon {...props} />,
  },
  {
    id: 'instagram',
    label: 'Instagram',
    handle: '@shamsjiyoo2026',
    href: OFFICIAL_INSTAGRAM_URL,
    accentColor: '#DB2777',
    icon: (props) => <InstagramIcon {...props} />,
  },
  {
    id: 'phone',
    label: 'Call Us',
    handle: '+91 97393 91891',
    href: 'tel:+919739391891',
    accentColor: '#1C1917',
    icon: (props) => <PhoneCallIcon {...props} />,
  },
  {
    id: 'email',
    label: 'Email',
    handle: 'shamsjiyoo@gmail.com',
    href: 'mailto:shamsjiyoo@gmail.com?cc=jiyooshams@gmail.com',
    accentColor: '#B45309',
    icon: (props) => <EmailEnvelopeIcon {...props} />,
  },
];
