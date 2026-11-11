import { useState, useEffect, useCallback } from 'react';

export const OPEN_INSTALL_MODAL_EVENT = 'jiyoo-open-install-modal';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
  prompt(): Promise<void>;
}

let deferredInstallPrompt: BeforeInstallPromptEvent | null = null;
const listeners = new Set<() => void>();

function notifyListeners() {
  for (const listener of listeners) {
    try {
      listener();
    } catch {
      // ignore
    }
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e: Event) => {
    e.preventDefault();
    deferredInstallPrompt = e as BeforeInstallPromptEvent;
    notifyListeners();
  });

  window.addEventListener('appinstalled', () => {
    deferredInstallPrompt = null;
    notifyListeners();
  });
}

export function canPromptInstall(): boolean {
  return Boolean(deferredInstallPrompt);
}

export function isIOSDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  return /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

export function isAndroidDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /Android/i.test(navigator.userAgent || '');
}

export function isRunningStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  const isStandaloneMedia = window.matchMedia?.('(display-mode: standalone)')?.matches;
  const isNavigatorStandalone = (window.navigator as any)?.standalone === true;
  return Boolean(isStandaloneMedia || isNavigatorStandalone);
}

export async function requestInstall(): Promise<boolean> {
  if (!deferredInstallPrompt) return false;
  try {
    await deferredInstallPrompt.prompt();
    const choice = await deferredInstallPrompt.userChoice;
    deferredInstallPrompt = null;
    notifyListeners();
    return choice.outcome === 'accepted';
  } catch {
    return false;
  }
}

export function useInstallPrompt() {
  const [canInstall, setCanInstall] = useState<boolean>(() => canPromptInstall());
  const [isStandalone, setIsStandalone] = useState<boolean>(() => isRunningStandalone());
  const [isIOS] = useState<boolean>(() => isIOSDevice());

  useEffect(() => {
    const update = () => {
      setCanInstall(canPromptInstall());
      setIsStandalone(isRunningStandalone());
    };
    listeners.add(update);
    return () => {
      listeners.delete(update);
    };
  }, []);

  const triggerInstall = useCallback(async () => {
    if (deferredInstallPrompt) {
      const accepted = await requestInstall();
      if (accepted) return true;
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(OPEN_INSTALL_MODAL_EVENT));
    }
    return false;
  }, []);

  return {
    canInstall,
    isStandalone,
    isIOS,
    triggerInstall,
  };
}
