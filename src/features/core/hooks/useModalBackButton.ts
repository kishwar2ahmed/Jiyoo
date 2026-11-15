import { useEffect, useRef } from "react";

// Global overlay tracking across the application (LIFO stack)
const overlayStack: symbol[] = [];
let programmaticBackCount = 0;
let lastOverlayClosedTimestamp = 0;

function syncDocumentScrollLock(): void {
  if (typeof document === "undefined") return;
  const html = document.documentElement;
  const body = document.body;
  if (!html || !body) return;

  if (overlayStack.length > 0) {
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

function removeFromOverlayStack(token: symbol): void {
  const idx = overlayStack.lastIndexOf(token);
  if (idx !== -1) {
    overlayStack.splice(idx, 1);
  }
}

function isTopOverlay(token: symbol): boolean {
  return overlayStack.length > 0 && overlayStack[overlayStack.length - 1] === token;
}

/**
 * Returns true if an overlay is currently active.
 */
export function isOverlayActive(): boolean {
  return overlayStack.length > 0;
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

export interface UseModalBackButtonOptions {
  closeOnEscape?: boolean;
}

/**
 * Makes the device/browser back button and Escape key close only the topmost
 * open overlay one step at a time instead of dismissing stacked overlays at once,
 * while strictly locking background page scrolling.
 */
export function useModalBackButton(
  isOpen: boolean,
  onClose: () => void,
  options?: UseModalBackButtonOptions
) {
  const activeRef = useRef(false);
  const tokenRef = useRef<symbol | null>(null);
  const onCloseRef = useRef(onClose);
  const closeOnEscape = options?.closeOnEscape ?? true;

  // Keep the ref pointing at the latest onClose without mutating it during render
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!isOpen) return;

    const token = Symbol("jiyooOverlay");
    tokenRef.current = token;
    overlayStack.push(token);
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
      if (!activeRef.current || !isTopOverlay(token)) return;
      activeRef.current = false;
      removeFromOverlayStack(token);
      syncDocumentScrollLock();
      lastOverlayClosedTimestamp = Date.now();
      onCloseRef.current();
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!closeOnEscape) return;
      if (e.key === "Escape" && activeRef.current && isTopOverlay(token)) {
        e.stopPropagation();
        e.stopImmediatePropagation?.();
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
        removeFromOverlayStack(token);
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
  }, [isOpen, closeOnEscape]);
}
