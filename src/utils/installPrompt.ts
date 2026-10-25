// Captures the browser's native "Add to Home Screen" install prompt so the
// UI can trigger it on demand (from a "Get Our App" button) instead of
// waiting for the browser's own mini-infobar. This module attaches its
// listener the moment it is imported, so it must be imported once, early,
// before the app renders - `beforeinstallprompt` fires only once per page
// load and is lost if nothing is listening yet.

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

let deferredPrompt: BeforeInstallPromptEvent | null = null;
let hasInstalled = false;

export const INSTALL_AVAILABLE_EVENT = "jiyoo:install-available";
export const INSTALL_COMPLETED_EVENT = "jiyoo:install-completed";

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    // Stop Chrome's default mini-infobar so we control the moment it shows.
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

/** True once the app has been installed in this browser session. */
export function wasJustInstalled(): boolean {
  return hasInstalled;
}

/** True if already running as an installed app (standalone display mode). */
export function isRunningStandalone(): boolean {
  if (typeof window === "undefined") return false;
  const iosStandalone = (window.navigator as any).standalone === true;
  return window.matchMedia?.("(display-mode: standalone)").matches || iosStandalone;
}

/** True on iOS Safari, which has no `beforeinstallprompt` API at all. */
export function isIOSDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

/** True once the browser has handed us a real, triggerable install prompt. */
export function canPromptInstall(): boolean {
  return deferredPrompt !== null;
}

/**
 * Triggers the real native install prompt captured earlier. Resolves to
 * whether the user accepted it. Returns false immediately (no-op) if no
 * prompt has been captured - callers should check `canPromptInstall()` /
 * fall back to manual instructions (e.g. on iOS) rather than call this
 * blindly.
 */
export async function requestInstall(): Promise<boolean> {
  if (!deferredPrompt) return false;
  const promptEvent = deferredPrompt;
  deferredPrompt = null;
  await promptEvent.prompt();
  const choice = await promptEvent.userChoice;
  return choice.outcome === "accepted";
}
