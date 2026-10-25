import { useEffect, useRef } from "react";

/**
 * Makes the device/browser back button close an open overlay (product modal,
 * cart, account panel, etc.) one step at a time instead of navigating away
 * from the site entirely.
 *
 * While `isOpen` is true, a lightweight history entry is pushed so the very
 * next back button press is captured by the app and simply closes the
 * overlay by calling `onClose`. If the overlay is instead closed normally
 * (X button, backdrop tap, a save/submit action, etc.), the pushed entry is
 * quietly popped again so the history stack never accumulates stale marker
 * entries and a later back press behaves exactly as the user expects.
 *
 * Usage: call this once near the top of any modal/panel component that
 * already accepts `isOpen` + `onClose` (or, for components that only exist
 * in the tree while open, pass `true` for `isOpen`).
 */
export function useModalBackButton(isOpen: boolean, onClose: () => void) {
  const activeRef = useRef(false);
  const onCloseRef = useRef(onClose);

  // Keep the ref pointing at the latest onClose without mutating it during
  // render (refs must only be written in effects/handlers, never render).
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!isOpen) return;

    window.history.pushState({ jiyooOverlay: true }, "", window.location.href);
    activeRef.current = true;

    const handlePopState = () => {
      if (!activeRef.current) return;
      activeRef.current = false;
      onCloseRef.current();
    };

    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
      // Closed via the UI (not the back button) - pop our marker entry so
      // it doesn't sit stale in the history stack.
      if (activeRef.current) {
        activeRef.current = false;
        window.history.back();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);
}
