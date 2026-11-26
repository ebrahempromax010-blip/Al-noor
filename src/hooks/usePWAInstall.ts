import { useCallback, useEffect, useRef, useState } from 'react';
import {
  detectInstallPlatform,
  evaluateInstallButtonVisibility,
  type InstallPlatform,
} from '../utils/pwaLogic';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

interface RelatedApplication {
  platform: string;
  url?: string;
  id?: string;
}

declare global {
  interface Window {
    __deferredPwaPrompt?: BeforeInstallPromptEvent | null;
    __pwaAppInstalled?: boolean;
  }
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

function checkIsInIframe(): boolean {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}

export function usePWAInstall() {
  const initialPrompt =
    typeof window !== 'undefined' ? window.__deferredPwaPrompt || null : null;
  const initialPlatform: InstallPlatform =
    typeof window !== 'undefined'
      ? detectInstallPlatform(window.navigator.userAgent, window.navigator.maxTouchPoints || 0)
      : 'desktop';

  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(
    initialPrompt
  );
  const [isInstalled, setIsInstalled] = useState(false);
  const [platform, setPlatform] = useState<InstallPlatform>(initialPlatform);
  const [isInIframe] = useState<boolean>(() =>
    typeof window !== 'undefined' ? checkIsInIframe() : false
  );

  const deferredPromptRef = useRef<BeforeInstallPromptEvent | null>(initialPrompt);
  const appInstalledFiredRef = useRef<boolean>(
    typeof window !== 'undefined' ? Boolean(window.__pwaAppInstalled) : false
  );
  const justInstalledInSessionRef = useRef(false);

  const recomputeInstallState = useCallback(async () => {
    if (window.__deferredPwaPrompt && !deferredPromptRef.current) {
      deferredPromptRef.current = window.__deferredPwaPrompt;
      setDeferredPrompt(window.__deferredPwaPrompt);
    }
    if (window.__pwaAppInstalled) {
      appInstalledFiredRef.current = true;
    }

    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      window.matchMedia('(display-mode: minimal-ui)').matches ||
      window.matchMedia('(display-mode: fullscreen)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;

    const detectedPlatform = detectInstallPlatform(
      window.navigator.userAgent,
      window.navigator.maxTouchPoints || 0
    );
    setPlatform(detectedPlatform);
    const iosDevice = detectedPlatform === 'ios';

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
      window.__pwaAppInstalled = false;
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
      window.__deferredPwaPrompt = promptEvt;
      window.__pwaAppInstalled = false;
      deferredPromptRef.current = promptEvt;
      appInstalledFiredRef.current = false;
      justInstalledInSessionRef.current = false;
      writeInstalledStorageFlag(false);
      setDeferredPrompt(promptEvt);
      setIsInstalled(false);
    };

    const handleCapturedEarlyPrompt = () => {
      if (window.__deferredPwaPrompt) {
        deferredPromptRef.current = window.__deferredPwaPrompt;
        appInstalledFiredRef.current = false;
        justInstalledInSessionRef.current = false;
        writeInstalledStorageFlag(false);
        setDeferredPrompt(window.__deferredPwaPrompt);
        setIsInstalled(false);
      }
    };

    const handleAppInstalled = () => {
      appInstalledFiredRef.current = true;
      justInstalledInSessionRef.current = true;
      deferredPromptRef.current = null;
      window.__deferredPwaPrompt = null;
      window.__pwaAppInstalled = true;
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
    window.addEventListener('alnour:pwa-prompt-captured', handleCapturedEarlyPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    window.addEventListener('alnour:pwa-installed', handleAppInstalled);
    window.addEventListener('focus', handleVisibilityOrFocus);
    document.addEventListener('visibilitychange', handleVisibilityOrFocus);

    return () => {
      standaloneMql.removeEventListener?.('change', handleDisplayModeChange);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('alnour:pwa-prompt-captured', handleCapturedEarlyPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('alnour:pwa-installed', handleAppInstalled);
      window.removeEventListener('focus', handleVisibilityOrFocus);
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
    };
  }, [recomputeInstallState]);

  const waitForDeferredPrompt = async (timeoutMs: number): Promise<BeforeInstallPromptEvent | null> => {
    const existing = deferredPromptRef.current || deferredPrompt || window.__deferredPwaPrompt || null;
    if (existing) return existing;
    if (platform === 'ios' || isInIframe) return null;

    return new Promise((resolve) => {
      let settled = false;
      const done = (evt: BeforeInstallPromptEvent | null) => {
        if (settled) return;
        settled = true;
        window.clearTimeout(timer);
        window.removeEventListener('beforeinstallprompt', onPrompt);
        window.removeEventListener('alnour:pwa-prompt-captured', onCaptured);
        resolve(evt);
      };
      const onPrompt = (e: Event) => {
        e.preventDefault();
        const promptEvt = e as BeforeInstallPromptEvent;
        deferredPromptRef.current = promptEvt;
        window.__deferredPwaPrompt = promptEvt;
        setDeferredPrompt(promptEvt);
        done(promptEvt);
      };
      const onCaptured = () => {
        if (window.__deferredPwaPrompt) {
          deferredPromptRef.current = window.__deferredPwaPrompt;
          setDeferredPrompt(window.__deferredPwaPrompt);
          done(window.__deferredPwaPrompt);
        }
      };
      const timer = window.setTimeout(() => done(null), timeoutMs);
      window.addEventListener('beforeinstallprompt', onPrompt);
      window.addEventListener('alnour:pwa-prompt-captured', onCaptured);
    });
  };

  const install = async () => {
    const immediatePrompt =
      deferredPromptRef.current || deferredPrompt || window.__deferredPwaPrompt || null;
    const promptEvt = immediatePrompt || (await waitForDeferredPrompt(350));
    if (!promptEvt) return false;
    try {
      await promptEvt.prompt();
      const { outcome } = await promptEvt.userChoice;
      if (outcome === 'accepted') {
        appInstalledFiredRef.current = true;
        justInstalledInSessionRef.current = true;
        deferredPromptRef.current = null;
        window.__deferredPwaPrompt = null;
        window.__pwaAppInstalled = true;
        writeInstalledStorageFlag(true);
        setIsInstalled(true);
        setDeferredPrompt(null);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  return {
    isInstallable: Boolean(deferredPrompt || deferredPromptRef.current),
    isInstalled,
    isIOS: platform === 'ios',
    platform,
    isInIframe,
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
