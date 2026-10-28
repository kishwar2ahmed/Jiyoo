import React from "react";

interface IconProps {
  className?: string;
  size?: number | string;
}

/**
 * Official Unified Payments Interface (UPI) Logo
 * Exact original NPCI vector mark from official guidelines
 */
export function UpiOfficialIcon({ className = "h-5 w-auto", size }: IconProps) {
  return (
    <img
      src="/payment-icons/upi.svg"
      alt="UPI - Unified Payments Interface"
      className={`object-contain select-none ${className}`}
      style={size ? { height: size } : undefined}
      loading="eager"
      decoding="async"
    />
  );
}

/**
 * Official Google Pay (GPay) Logo
 * Exact original 4-color intertwined ribbon emblem & wordmark
 */
export function GooglePayIcon({ className = "h-5 w-auto", size }: IconProps) {
  return (
    <img
      src="/payment-icons/gpay.svg"
      alt="Google Pay"
      className={`object-contain select-none ${className}`}
      style={size ? { height: size } : undefined}
      loading="eager"
      decoding="async"
    />
  );
}

/**
 * Official PhonePe Logo
 * Exact original purple brandmark with white Devanagari 'पे' glyph
 */
export function PhonePeIcon({ className = "h-5 w-auto", size }: IconProps) {
  return (
    <img
      src="/payment-icons/phonepe.svg"
      alt="PhonePe"
      className={`object-contain select-none ${className}`}
      style={size ? { height: size } : undefined}
      loading="eager"
      decoding="async"
    />
  );
}

/**
 * Official Paytm Logo
 * Exact original navy 'Pay' and bright cyan 'tm'
 */
export function PaytmIcon({ className = "h-5 w-auto", size }: IconProps) {
  return (
    <img
      src="/payment-icons/paytm.svg"
      alt="Paytm"
      className={`object-contain select-none ${className}`}
      style={size ? { height: size } : undefined}
      loading="eager"
      decoding="async"
    />
  );
}

/**
 * Official Mastercard Logo
 * Exact original intersecting red & yellow circles
 */
export function MastercardIcon({ className = "h-5 w-auto", size }: IconProps) {
  return (
    <img
      src="/payment-icons/mastercard.svg"
      alt="Mastercard"
      className={`object-contain select-none ${className}`}
      style={size ? { height: size } : undefined}
      loading="eager"
      decoding="async"
    />
  );
}

/**
 * Official Visa Logo
 * Exact original 2021+ royal blue Visa wordmark
 */
export function VisaIcon({ className = "h-4 w-auto", size }: IconProps) {
  return (
    <img
      src="/payment-icons/visa.svg"
      alt="Visa"
      className={`object-contain select-none ${className}`}
      style={size ? { height: size } : undefined}
      loading="eager"
      decoding="async"
    />
  );
}

/**
 * Official RuPay Logo
 * Exact original Indian payment network mark
 */
export function RuPayIcon({ className = "h-4 w-auto", size }: IconProps) {
  return (
    <img
      src="/payment-icons/rupay.svg"
      alt="RuPay"
      className={`object-contain select-none ${className}`}
      style={size ? { height: size } : undefined}
      loading="eager"
      decoding="async"
    />
  );
}

/**
 * Composite UPI & Cards Accepted Row
 * Clean, high-fidelity trust bar with original brand marks
 */
export function UpiAppsPillRow({ className = "" }: { className?: string }) {
  return (
    <div
      className={`inline-flex flex-wrap items-center gap-3.5 py-1 ${className}`}
      aria-label="Supported Payment Methods: Google Pay, PhonePe, Paytm, UPI, Mastercard, Visa, RuPay"
    >
      <GooglePayIcon className="h-4 w-auto" />
      <PhonePeIcon className="h-4 w-auto" />
      <PaytmIcon className="h-3.5 w-auto" />
      <UpiOfficialIcon className="h-4 w-auto" />
      <VisaIcon className="h-3.5 w-auto" />
      <MastercardIcon className="h-4 w-auto" />
      <RuPayIcon className="h-3.5 w-auto" />
    </div>
  );
}
