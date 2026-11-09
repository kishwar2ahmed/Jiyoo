import { useEffect, useRef } from "react";

// Global overlay tracking across the application
let activeOverlayCount = 0;
let programmaticBackCount = 0;
let lastOverlayClosedTimestamp = 0;

function syncDocumentScrollLock(): void {
  if (typeof document === "undefined") return;
  const html = document.documentElement;
  const body = document.body;
  if (!html || !body) return;

  if (activeOverlayCount > 0) {
    html.style.overflow = "hidden";
    html.style.overscrollBehavior = "none";
    body.style.overflow = "hidden";
    body.style.overscrollBehavior = "none";
  } else {
    html.style.overflow = "";
    html.style.overscrollBehavior = "";
    body.style.overflow = "";
    body.style.overscrollBehavior = "";
  }
}

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
  return (
    programmaticBackCount > 0 || Date.now() - lastOverlayClosedTimestamp < 650
  );
}

/**
 * Consumes the programmatic pop flag to prevent any global exit dialogs from intercepting it.
 */
export function consumeProgrammaticDismissal(): boolean {
  if (programmaticBackCount > 0) {
    programmaticBackCount--;
    return true;
  }
  if (Date.now() - lastOverlayClosedTimestamp < 650) {
    return true;
  }
  return false;
}

/**
 * Makes the device/browser back button close an open overlay (product modal,
 * cart, account panel, etc.) one step at a time instead of navigating away
 * from the site entirely, while strictly locking background page scrolling.
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
    syncDocumentScrollLock();

    const isIframe =
      typeof window !== "undefined" && window.self !== window.top;

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
      syncDocumentScrollLock();
      lastOverlayClosedTimestamp = Date.now();
      onCloseRef.current();
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && activeRef.current) {
        e.stopPropagation();
        onCloseRef.current();
      }
    };

    window.addEventListener("popstate", handlePopState);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("popstate", handlePopState);
      window.removeEventListener("keydown", handleKeyDown);
      if (activeRef.current) {
        activeRef.current = false;
        activeOverlayCount = Math.max(0, activeOverlayCount - 1);
        syncDocumentScrollLock();
        lastOverlayClosedTimestamp = Date.now();
        if (!isIframe && window.history.state?.jiyooOverlay) {
          try {
            window.history.replaceState(
              { jiyooGuard: true },
              "",
              window.location.href
            );
          } catch {
            // Ignore history state replacement errors
          }
        }
      }
    };
  }, [isOpen]);
}
