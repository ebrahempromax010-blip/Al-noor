import { useCallback, useEffect, useRef, useState } from 'react';
import { evaluateInstallButtonVisibility } from '../utils/pwaLogic';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

interface RelatedApplication {
  platform: string;
  url?: string;
  id?: string;
}

const INSTALLED_STORAGE_KEY = 'alnour_pwa_installed';

function readInstalledStorageFlag(): boolean {
  try {
    return window.localStorage.getItem(INSTALLED_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

function writeInstalledStorageFlag(installed: boolean): void {
  try {
    if (installed) {
      window.localStorage.setItem(INSTALLED_STORAGE_KEY, '1');
    } else {
      window.localStorage.removeItem(INSTALLED_STORAGE_KEY);
    }
  } catch {
    // Ignore storage access errors in restricted modes
  }
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  const deferredPromptRef = useRef<BeforeInstallPromptEvent | null>(null);
  const appInstalledFiredRef = useRef(false);
  const justInstalledInSessionRef = useRef(false);

  const recomputeInstallState = useCallback(async () => {
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      window.matchMedia('(display-mode: minimal-ui)').matches ||
      window.matchMedia('(display-mode: fullscreen)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;

    const userAgent = window.navigator.userAgent.toLowerCase();
    const iosDevice =
      /iphone|ipad|ipod/.test(userAgent) ||
      (/macintosh/.test(userAgent) && (window.navigator.maxTouchPoints || 0) > 1);
    setIsIOS(iosDevice);

    let relatedAppsCount: number | null = null;
    const nav = window.navigator as Navigator & {
      getInstalledRelatedApps?: () => Promise<RelatedApplication[]>;
    };
    if (typeof nav.getInstalledRelatedApps === 'function') {
      try {
        const apps = await nav.getInstalledRelatedApps();
        relatedAppsCount = Array.isArray(apps) ? apps.length : 0;
      } catch {
        relatedAppsCount = null;
      }
    }

    const decision = evaluateInstallButtonVisibility({
      isStandalone,
      appInstalledEventFired: appInstalledFiredRef.current,
      justInstalledInSession: justInstalledInSessionRef.current,
      hasBeforeInstallPrompt: Boolean(deferredPromptRef.current),
      relatedAppsCount,
      wasPreviouslyInstalledFlag: readInstalledStorageFlag(),
      isIOS: iosDevice,
    });

    if (decision.shouldClearInstalledFlag) {
      writeInstalledStorageFlag(false);
      appInstalledFiredRef.current = false;
    } else if (isStandalone || (relatedAppsCount !== null && relatedAppsCount > 0)) {
      writeInstalledStorageFlag(true);
    }

    setIsInstalled(decision.isInstalled);
  }, []);

  useEffect(() => {
    void recomputeInstallState();

    const standaloneMql = window.matchMedia('(display-mode: standalone)');
    const handleDisplayModeChange = () => {
      void recomputeInstallState();
    };

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const promptEvt = e as BeforeInstallPromptEvent;
      deferredPromptRef.current = promptEvt;
      appInstalledFiredRef.current = false;
      justInstalledInSessionRef.current = false;
      writeInstalledStorageFlag(false);
      setDeferredPrompt(promptEvt);
      setIsInstalled(false);
    };

    const handleAppInstalled = () => {
      appInstalledFiredRef.current = true;
      justInstalledInSessionRef.current = true;
      deferredPromptRef.current = null;
      writeInstalledStorageFlag(true);
      setDeferredPrompt(null);
      setIsInstalled(true);
    };

    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === 'visible') {
        justInstalledInSessionRef.current = false;
        void recomputeInstallState();
      }
    };

    standaloneMql.addEventListener?.('change', handleDisplayModeChange);
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    window.addEventListener('focus', handleVisibilityOrFocus);
    document.addEventListener('visibilitychange', handleVisibilityOrFocus);

    return () => {
      standaloneMql.removeEventListener?.('change', handleDisplayModeChange);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('focus', handleVisibilityOrFocus);
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
    };
  }, [recomputeInstallState]);

  const install = async () => {
    if (!deferredPrompt) return false;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      appInstalledFiredRef.current = true;
      justInstalledInSessionRef.current = true;
      deferredPromptRef.current = null;
      writeInstalledStorageFlag(true);
      setIsInstalled(true);
      setDeferredPrompt(null);
      return true;
    }
    return false;
  };

  return {
    isInstallable: !!deferredPrompt,
    isInstalled,
    isIOS,
    install,
  };
}

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}
