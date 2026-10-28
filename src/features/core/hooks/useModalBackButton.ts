import { useEffect, useRef } from "react";

// Global overlay tracking across the application
let activeOverlayCount = 0;
let programmaticBackCount = 0;
let lastOverlayClosedTimestamp = 0;

/**
 * Returns true if an overlay is currently active.
 */
export function isOverlayActive(): boolean {
  return activeOverlayCount > 0;
}

/**
 * Returns true if an overlay dismissal occurred recently or a programmatic back is in progress.
 */
export function isProgrammaticOverlayDismissal(): boolean {
  return programmaticBackCount > 0 || (Date.now() - lastOverlayClosedTimestamp < 600);
}

/**
 * Consumes the programmatic pop flag to prevent any global exit dialogs from intercepting it.
 */
export function consumeProgrammaticDismissal(): boolean {
  if (programmaticBackCount > 0) {
    programmaticBackCount--;
    return true;
  }
  if (Date.now() - lastOverlayClosedTimestamp < 600) {
    return true;
  }
  return false;
}

/**
 * Makes the device/browser back button close an open overlay (product modal,
 * cart, account panel, etc.) one step at a time instead of navigating away
 * from the site entirely.
 *
 * Inside an iframe (such as AI Studio preview), history entries are intentionally
 * not pushed/popped so parent frame navigation is never disrupted and exit prompts
 * are never triggered.
 *
 * In standalone browsers, while `isOpen` is true, a lightweight history entry is
 * pushed so the next back button press is captured and closes the overlay.
 * If the overlay is closed via UI, the marker entry is popped with programmatic
 * flags so exit confirmation dialogs never misinterpret it as an app exit.
 */
export function useModalBackButton(isOpen: boolean, onClose: () => void) {
  const activeRef = useRef(false);
  const onCloseRef = useRef(onClose);

  // Keep the ref pointing at the latest onClose without mutating it during render
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!isOpen) return;

    activeOverlayCount++;
    activeRef.current = true;

    // Do not manipulate browser history inside an iframe
    const isIframe = typeof window !== "undefined" && window.self !== window.top;

    if (!isIframe) {
      window.history.pushState(
        { jiyooOverlay: true, timestamp: Date.now() },
        "",
        window.location.href
      );
    }

    const handlePopState = () => {
      if (!activeRef.current) return;
      activeRef.current = false;
      activeOverlayCount = Math.max(0, activeOverlayCount - 1);
      lastOverlayClosedTimestamp = Date.now();
      onCloseRef.current();
    };

    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
      if (activeRef.current) {
        activeRef.current = false;
        activeOverlayCount = Math.max(0, activeOverlayCount - 1);
        lastOverlayClosedTimestamp = Date.now();
        if (!isIframe) {
          programmaticBackCount++;
          window.history.back();
        }
      }
    };
  }, [isOpen]);
}
