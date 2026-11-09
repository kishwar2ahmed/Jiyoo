// Captures the browser's native "Add to Home Screen" / Desktop PWA install prompt
// so the UI can trigger it on demand (from "Install JIYOO" actions in the Navbar,
// Mobile Drawer, and Footer) instead of waiting for the browser's mini-infobar.
// This module attaches its listener the moment it is imported in main.tsx.

import { useState, useEffect } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

let deferredPrompt: BeforeInstallPromptEvent | null = null;
let hasInstalled = false;

export const INSTALL_AVAILABLE_EVENT = "jiyoo:install-available";
export const INSTALL_COMPLETED_EVENT = "jiyoo:install-completed";
export const OPEN_INSTALL_MODAL_EVENT = "jiyoo:open-install-modal";

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    // Stop Chrome/Edge default mini-infobar so we control when the prompt triggers.
    e.preventDefault();
    deferredPrompt = e as BeforeInstallPromptEvent;
    window.dispatchEvent(new Event(INSTALL_AVAILABLE_EVENT));
  });

  window.addEventListener("appinstalled", () => {
    hasInstalled = true;
    deferredPrompt = null;
    window.dispatchEvent(new Event(INSTALL_COMPLETED_EVENT));
  });
}

/** True if already running as an installed app (standalone or window-controls-overlay). */
export function isRunningStandalone(): boolean {
  if (typeof window === "undefined") return false;
  const iosStandalone = (window.navigator as { standalone?: boolean }).standalone === true;
  const isStandaloneMedia =
    window.matchMedia?.("(display-mode: standalone)").matches ||
    window.matchMedia?.("(display-mode: window-controls-overlay)").matches ||
    window.matchMedia?.("(display-mode: minimal-ui)").matches;
  return Boolean(isStandaloneMedia || iosStandalone || hasInstalled);
}

/** True on iOS / iPadOS devices. */
export function isIOSDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  const isIOSUA = /iphone|ipad|ipod/i.test(ua);
  // iPadOS 13+ reports Macintosh in userAgent with multi-touch support
  const isIPadOS =
    /macintosh/i.test(ua) &&
    typeof navigator.maxTouchPoints === "number" &&
    navigator.maxTouchPoints > 1;
  return isIOSUA || isIPadOS;
}

/** True on Android phones or tablets. */
export function isAndroidDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  return /android/i.test(navigator.userAgent || "");
}

/** True on mobile/tablet touch viewports. */
export function isMobileDevice(): boolean {
  if (typeof window === "undefined") return false;
  return isIOSDevice() || isAndroidDevice() || window.innerWidth < 768;
}

/** True once the browser has handed us a real, triggerable native install prompt. */
export function canPromptInstall(): boolean {
  return deferredPrompt !== null;
}

/**
 * Triggers the real native install prompt captured earlier (Desktop Chrome/Edge or Android Chrome).
 * Resolves to whether the user accepted it. Returns false immediately if no prompt was captured.
 */
export async function requestInstall(): Promise<boolean> {
  if (!deferredPrompt) return false;
  const promptEvent = deferredPrompt;
  deferredPrompt = null;
  window.dispatchEvent(new Event(INSTALL_AVAILABLE_EVENT));
  try {
    await promptEvent.prompt();
    const choice = await promptEvent.userChoice;
    if (choice.outcome === "accepted") {
      hasInstalled = true;
      window.dispatchEvent(new Event(INSTALL_COMPLETED_EVENT));
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Unified install trigger used by Navbar, Mobile Drawer, and Footer buttons:
 * - If the browser has a ready native install prompt (Desktop Chrome/Edge, Android Chrome),
 *   it triggers the native OS/browser install dialog immediately.
 * - Otherwise (or if the user dismisses it / is on iOS Safari or macOS Safari),
 *   it opens the tailored JIYOO Install guide modal for Mobile & Desktop.
 */
export async function triggerInstallFlow(): Promise<void> {
  if (canPromptInstall()) {
    const accepted = await requestInstall();
    if (!accepted && typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent(OPEN_INSTALL_MODAL_EVENT));
    }
    return;
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(OPEN_INSTALL_MODAL_EVENT));
  }
}

/** Reactive hook for components that render an "Install JIYOO" button. */
export function useInstallPrompt() {
  const [isStandalone, setIsStandalone] = useState<boolean>(() => isRunningStandalone());
  const [canNativePrompt, setCanNativePrompt] = useState<boolean>(() => canPromptInstall());

  useEffect(() => {
    const syncState = () => {
      setIsStandalone(isRunningStandalone());
      setCanNativePrompt(canPromptInstall());
    };

    window.addEventListener(INSTALL_AVAILABLE_EVENT, syncState);
    window.addEventListener(INSTALL_COMPLETED_EVENT, syncState);

    const mediaQuery = window.matchMedia?.("(display-mode: standalone)");
    if (mediaQuery?.addEventListener) {
      mediaQuery.addEventListener("change", syncState);
    }

    return () => {
      window.removeEventListener(INSTALL_AVAILABLE_EVENT, syncState);
      window.removeEventListener(INSTALL_COMPLETED_EVENT, syncState);
      if (mediaQuery?.removeEventListener) {
        mediaQuery.removeEventListener("change", syncState);
      }
    };
  }, []);

  return {
    isStandalone,
    canNativePrompt,
    isIOS: isIOSDevice(),
    isAndroid: isAndroidDevice(),
    isMobile: isMobileDevice(),
    triggerInstall: triggerInstallFlow,
  };
}
