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

export interface SectionSnapshot {
  page: "retail" | "wholesale";
  categoryId: string;
  subcategoryId: string | null;
  subSubcategoryId: string | null;
  searchQuery: string;
  scrollY?: number;
}

// In-memory stack of visited sections so Back button always steps through
// previous sections (page / category / subcategory / sub-subcategory / search)
// before ever showing the "Leave the app?" confirmation at the very end.
const sectionStack: SectionSnapshot[] = [];
const sectionListeners = new Set<(snapshot: SectionSnapshot) => void>();

function snapshotsEqual(a: SectionSnapshot, b: SectionSnapshot): boolean {
  return (
    a.page === b.page &&
    a.categoryId === b.categoryId &&
    (a.subcategoryId ?? null) === (b.subcategoryId ?? null) &&
    (a.subSubcategoryId ?? null) === (b.subSubcategoryId ?? null) &&
    a.searchQuery.trim() === b.searchQuery.trim()
  );
}

/**
 * Initializes or updates the base (root) section snapshot when the app first loads.
 */
export function initSectionHistory(initial: SectionSnapshot): void {
  if (sectionStack.length === 0) {
    sectionStack.push({ ...initial, searchQuery: initial.searchQuery.trim() });
  } else {
    sectionStack[0] = { ...initial, searchQuery: initial.searchQuery.trim() };
  }
}

/**
 * Returns the current top section snapshot on the stack, if any.
 */
export function getCurrentSectionSnapshot(): SectionSnapshot | null {
  return sectionStack.length > 0 ? sectionStack[sectionStack.length - 1] : null;
}

/**
 * Pushes a new section state onto the navigation stack and records a browser
 * history entry so the hardware/browser Back button steps back to the previous section.
 */
export function pushSectionHistory(next: SectionSnapshot, customUrl?: string): void {
  const normalized: SectionSnapshot = {
    ...next,
    subcategoryId: next.subcategoryId ?? null,
    subSubcategoryId: next.subSubcategoryId ?? null,
    searchQuery: next.searchQuery.trim(),
  };

  if (sectionStack.length === 0) {
    sectionStack.push(normalized);
    return;
  }

  const current = sectionStack[sectionStack.length - 1];
  if (snapshotsEqual(current, normalized)) {
    return;
  }

  // Save current scroll position on the outgoing snapshot before pushing the new one
  if (typeof window !== "undefined") {
    current.scrollY = window.scrollY;
  }

  sectionStack.push(normalized);

  if (typeof window !== "undefined") {
    const isIframe = window.self !== window.top;
    const url =
      customUrl ??
      (normalized.page === "wholesale"
        ? "#wholesale"
        : window.location.pathname + window.location.search);
    if (!isIframe) {
      window.history.pushState(
        {
          jiyooSection: true,
          stepIndex: sectionStack.length - 1,
          snapshot: normalized,
        },
        "",
        url
      );
    }
  }
}

/**
 * Returns true if there is at least one previous section on the stack to go back to.
 */
export function canStepBackSection(): boolean {
  return sectionStack.length > 1;
}

/**
 * Pops the current section and notifies all registered listeners with the previous section.
 * Returns the restored previous section snapshot, or null if already at the root section.
 */
export function popToPreviousSection(): SectionSnapshot | null {
  if (sectionStack.length <= 1) {
    return null;
  }
  sectionStack.pop();
  const previous = sectionStack[sectionStack.length - 1];
  sectionListeners.forEach((listener) => {
    try {
      listener(previous);
    } catch (e) {
      console.error("Failed to notify section listener:", e);
    }
  });
  return previous;
}

/**
 * Subscribe to section restoration events triggered when the user presses Back.
 */
export function subscribeSectionRestore(
  listener: (snapshot: SectionSnapshot) => void
): () => void {
  sectionListeners.add(listener);
  return () => {
    sectionListeners.delete(listener);
  };
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

    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
      if (activeRef.current) {
        activeRef.current = false;
        activeOverlayCount = Math.max(0, activeOverlayCount - 1);
        syncDocumentScrollLock();
        lastOverlayClosedTimestamp = Date.now();
        if (!isIframe) {
          programmaticBackCount++;
          window.history.back();
        }
      }
    };
  }, [isOpen]);
}
