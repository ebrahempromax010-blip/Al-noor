export type InstallPlatform = 'ios' | 'android' | 'desktop';

export type InstallClickAction =
  | 'already_installed'
  | 'trigger_native_prompt'
  | 'show_ios_guide'
  | 'show_android_guide'
  | 'show_desktop_guide';

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
 * Classifies the visitor's device into ios (iPhone/iPad), android, or desktop (Windows/Mac/Linux).
 */
export function detectInstallPlatform(
  userAgent: string,
  maxTouchPoints: number = 0
): InstallPlatform {
  const ua = String(userAgent || '').toLowerCase();
  if (/iphone|ipad|ipod/.test(ua) || (/macintosh/.test(ua) && maxTouchPoints > 1)) {
    return 'ios';
  }
  if (/android/.test(ua)) {
    return 'android';
  }
  return 'desktop';
}

/**
 * Decides the exact action to take when the user taps the Install App button.
 * Native 1-tap prompt is always preferred whenever the browser provides beforeinstallprompt.
 */
export function resolveInstallClickAction(params: {
  platform: InstallPlatform;
  hasNativePrompt: boolean;
  isStandalone: boolean;
}): InstallClickAction {
  if (params.isStandalone) {
    return 'already_installed';
  }
  if (params.platform === 'ios') {
    return 'show_ios_guide';
  }
  if (params.hasNativePrompt) {
    return 'trigger_native_prompt';
  }
  return params.platform === 'android' ? 'show_android_guide' : 'show_desktop_guide';
}

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
    display_override: ['standalone', 'minimal-ui'],
    launch_handler: {
      client_mode: 'focus-existing',
    },
    orientation: 'any',
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

function escapeXmlChars(value: string): string {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Generates an unrestricted iOS/macOS Apple Configuration Profile (.mobileconfig) WebClip
 * linked directly to the live website URL (not isolated as a separate offline-only app).
 */
export function buildIosWebClipMobileConfig(params: {
  storeNameEn?: string | null;
  websiteOrigin: string;
  iconBase64?: string | null;
}): string {
  const appName = resolvePwaEnglishName(params.storeNameEn);
  const cleanUrl = /^https?:\/\//i.test(params.websiteOrigin.trim())
    ? params.websiteOrigin.trim().replace(/\/+$/, '') + '/'
    : 'https://al-nour-computer.web.app/';
  const hostSlug =
    appName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '.')
      .replace(/^\.+|\.+$/g, '') || 'alnour.computer';
  const cleanIconB64 = String(params.iconBase64 || '').replace(/[^A-Za-z0-9+/=]/g, '');

  const iconBlock = cleanIconB64
    ? `\n      <key>Icon</key>\n      <data>${cleanIconB64}</data>`
    : '';

  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>PayloadContent</key>
  <array>
    <dict>
      <key>FullScreen</key>
      <false/>
      <key>IgnoreManifestScope</key>
      <true/>
      <key>IsRemovable</key>
      <true/>
      <key>Label</key>
      <string>${escapeXmlChars(appName)}</string>
      <key>PayloadDescription</key>
      <string>Direct website-linked launcher for ${escapeXmlChars(appName)}</string>
      <key>PayloadDisplayName</key>
      <string>${escapeXmlChars(appName)}</string>
      <key>PayloadIdentifier</key>
      <string>com.${escapeXmlChars(hostSlug)}.webclip</string>
      <key>PayloadType</key>
      <string>com.apple.webClip.managed</string>
      <key>PayloadUUID</key>
      <string>A1B2C3D4-E5F6-4789-9012-ABCDEF123456</string>
      <key>PayloadVersion</key>
      <integer>1</integer>
      <key>Precomposed</key>
      <true/>
      <key>URL</key>
      <string>${escapeXmlChars(cleanUrl)}</string>${iconBlock}
    </dict>
  </array>
  <key>PayloadDisplayName</key>
  <string>${escapeXmlChars(appName)}</string>
  <key>PayloadIdentifier</key>
  <string>com.${escapeXmlChars(hostSlug)}.profile</string>
  <key>PayloadRemovalDisallowed</key>
  <false/>
  <key>PayloadType</key>
  <string>Configuration</string>
  <key>PayloadUUID</key>
  <string>F1E2D3C4-B5A6-4987-8123-654321FEDCBA</string>
  <key>PayloadVersion</key>
  <integer>1</integer>
</dict>
</plist>
`;
}

/**
 * Generates a universal Desktop (Windows / Mac / Linux) live-linked launcher HTML file.
 */
export function buildDesktopWebAppLauncherHtml(params: {
  storeNameEn?: string | null;
  websiteOrigin: string;
}): string {
  const appName = resolvePwaEnglishName(params.storeNameEn);
  const safeName = escapeXmlChars(appName);
  const cleanUrl = /^https?:\/\//i.test(params.websiteOrigin.trim())
    ? params.websiteOrigin.trim().replace(/\/+$/, '') + '/'
    : 'https://al-nour-computer.web.app/';
  const safeUrl = escapeXmlChars(cleanUrl);

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta http-equiv="refresh" content="0; url=${safeUrl}" />
    <title>${safeName} — App Launcher</title>
    <style>
      body { font-family: system-ui, -apple-system, sans-serif; background: #0A0F1C; color: #F8FAFC; display: flex; min-height: 100vh; align-items: center; justify-content: center; margin: 0; }
      .card { background: #131B2E; border: 1px solid rgba(59,130,246,0.3); border-radius: 20px; padding: 32px; max-width: 420px; text-align: center; }
      a { display: inline-block; margin-top: 16px; background: #2563EB; color: #fff; text-decoration: none; font-weight: 700; padding: 12px 24px; border-radius: 12px; }
    </style>
  </head>
  <body>
    <div class="card">
      <h2>${safeName}</h2>
      <p>Connecting directly to the live store...</p>
      <a href="${safeUrl}">Open ${safeName}</a>
    </div>
    <script>window.location.replace(${JSON.stringify(cleanUrl)});</script>
  </body>
</html>
`;
}

export const MAX_UPLOADED_APP_BYTES = 150 * 1024 * 1024;

export function validateUploadedAppBinaryFile(
  platform: 'android' | 'ios',
  fileName: string,
  sizeBytes: number
): { ok: true; cleanName: string; ext: string } | { ok: false; errorAr: string; errorEn: string } {
  const cleanName = String(fileName || '').trim().split(/[\\/]/).pop() || '';
  const match = cleanName.match(/\.(apk|aab|ipa|mobileconfig)$/i);
  const ext = match ? `.${match[1].toLowerCase()}` : '';

  if (platform === 'android' && ext !== '.apk' && ext !== '.aab') {
    return {
      ok: false,
      errorAr: 'يرجى اختيار ملف أندرويد بصيغة .apk أو .aab.',
      errorEn: 'Please choose a valid .apk or .aab Android package file.',
    };
  }
  if (platform === 'ios' && ext !== '.ipa' && ext !== '.mobileconfig') {
    return {
      ok: false,
      errorAr: 'يرجى اختيار ملف آيفون بصيغة .ipa أو .mobileconfig.',
      errorEn: 'Please choose a valid .ipa or .mobileconfig iPhone app file.',
    };
  }
  if (!Number.isFinite(sizeBytes) || sizeBytes <= 0) {
    return {
      ok: false,
      errorAr: 'الملف المختار فارغ.',
      errorEn: 'Selected file is empty.',
    };
  }
  if (sizeBytes > MAX_UPLOADED_APP_BYTES) {
    return {
      ok: false,
      errorAr: 'حجم الملف يتجاوز الحد الأقصى (150 ميجابايت).',
      errorEn: 'File size exceeds the 150MB upload limit.',
    };
  }
  return { ok: true, cleanName, ext };
}

export function formatFileSizeLabel(sizeBytes: number): string {
  const bytes = Math.max(0, Number(sizeBytes) || 0);
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  if (bytes >= 1024) {
    return `${Math.round(bytes / 1024)} KB`;
  }
  return `${bytes} B`;
}

