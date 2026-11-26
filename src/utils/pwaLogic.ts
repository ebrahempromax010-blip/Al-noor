export interface PwaInstallSignals {
  isStandalone: boolean;
  appInstalledEventFired: boolean;
  justInstalledInSession: boolean;
  hasBeforeInstallPrompt: boolean;
  relatedAppsCount: number | null;
  wasPreviouslyInstalledFlag: boolean;
  isIOS: boolean;
}

export interface PwaInstallDecision {
  isInstalled: boolean;
  shouldShowInstallButton: boolean;
  shouldClearInstalledFlag: boolean;
}

export const DEFAULT_PWA_ENGLISH_NAME = 'Al-Nour Computer';
export const DEFAULT_PWA_ENGLISH_TAGLINE = 'Computers, Laptops, Accessories & Genuine Software';

/**
 * Ensures the installed PWA launcher name on mobile/desktop always uses the English store name.
 */
export function resolvePwaEnglishName(storeNameEn?: string | null): string {
  const trimmed = String(storeNameEn || '').trim();
  if (trimmed && /[a-z0-9]/i.test(trimmed)) {
    return trimmed;
  }
  return DEFAULT_PWA_ENGLISH_NAME;
}

/**
 * Produces a concise <= 12 character English short_name for Android/iOS home screen icons.
 */
export function buildPwaShortName(englishName?: string | null): string {
  const full = resolvePwaEnglishName(englishName);
  if (full.length <= 12) return full;

  const words = full.split(/\s+/).filter(Boolean);
  let acc = '';
  for (const word of words) {
    const candidate = acc ? `${acc} ${word}` : word;
    if (candidate.length <= 12) {
      acc = candidate;
    } else {
      break;
    }
  }
  if (acc.length >= 3) {
    return acc;
  }
  return full.slice(0, 12).trim();
}

/**
 * Determines whether the app is currently installed and whether the Install button must be hidden or shown.
 * - Hides automatically when running in standalone mode or right after `appinstalled`.
 * - Automatically re-shows if `beforeinstallprompt` fires (browser confirms app was uninstalled/deleted),
 *   or if `getInstalledRelatedApps()` returns 0 installed apps when not just-installed,
 *   or on iOS Safari browser tab (so deleting the Home Screen app restores the install flow).
 */
export function evaluateInstallButtonVisibility(
  signals: PwaInstallSignals
): PwaInstallDecision {
  if (signals.isStandalone) {
    return {
      isInstalled: true,
      shouldShowInstallButton: false,
      shouldClearInstalledFlag: false,
    };
  }

  // If Chromium fires `beforeinstallprompt`, the OS/browser confirms the PWA is NOT currently installed
  // (for example, the user deleted/uninstalled it from Android, Windows, or macOS).
  if (signals.hasBeforeInstallPrompt) {
    return {
      isInstalled: false,
      shouldShowInstallButton: true,
      shouldClearInstalledFlag: true,
    };
  }

  if (signals.justInstalledInSession || signals.appInstalledEventFired) {
    return {
      isInstalled: true,
      shouldShowInstallButton: false,
      shouldClearInstalledFlag: false,
    };
  }

  if (signals.relatedAppsCount !== null) {
    if (signals.relatedAppsCount > 0) {
      return {
        isInstalled: true,
        shouldShowInstallButton: false,
        shouldClearInstalledFlag: false,
      };
    }
    return {
      isInstalled: false,
      shouldShowInstallButton: true,
      shouldClearInstalledFlag: signals.wasPreviouslyInstalledFlag,
    };
  }

  // iOS Safari cannot report Home Screen deletion to browser tabs, so non-standalone Safari keeps
  // the button available whenever the user is in the browser (and hides it inside the standalone app).
  if (signals.isIOS) {
    return {
      isInstalled: false,
      shouldShowInstallButton: true,
      shouldClearInstalledFlag: signals.wasPreviouslyInstalledFlag,
    };
  }

  if (signals.wasPreviouslyInstalledFlag) {
    return {
      isInstalled: true,
      shouldShowInstallButton: false,
      shouldClearInstalledFlag: false,
    };
  }

  return {
    isInstalled: false,
    shouldShowInstallButton: true,
    shouldClearInstalledFlag: false,
  };
}

export interface DynamicManifestInput {
  storeNameEn?: string | null;
  taglineEn?: string | null;
  version?: string | number;
  origin?: string;
}

export function buildDynamicManifestObject(input: DynamicManifestInput) {
  const englishName = resolvePwaEnglishName(input.storeNameEn);
  const shortName = buildPwaShortName(englishName);
  const description = String(input.taglineEn || '').trim() || DEFAULT_PWA_ENGLISH_TAGLINE;
  const v = encodeURIComponent(String(input.version || '1'));
  const cleanOrigin = String(input.origin || '').replace(/\/+$/, '');
  const manifestUrl = cleanOrigin ? `${cleanOrigin}/manifest.json` : '/manifest.json';

  return {
    id: '/',
    name: englishName,
    short_name: shortName,
    description,
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait-primary',
    background_color: '#0A0F1C',
    theme_color: '#0A0F1C',
    dir: 'ltr',
    lang: 'en',
    prefer_related_applications: false,
    related_applications: [
      {
        platform: 'webapp',
        url: manifestUrl,
      },
    ],
    icons: [
      {
        src: `/api/pwa-icon/192.png?v=${v}`,
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: `/api/pwa-icon/512.png?v=${v}`,
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: `/api/pwa-icon/maskable-512.png?v=${v}`,
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
