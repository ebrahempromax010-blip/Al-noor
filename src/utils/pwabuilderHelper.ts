import { buildPwaShortName, resolvePwaEnglishName } from './pwaLogic';
import { normalizeWebsiteOrigin, sanitizeAndroidPackageId } from './androidProjectGenerator';

export interface PwaBuilderCloudApkInput {
  storeNameEn?: string;
  websiteOrigin: string;
  packageId?: string;
  versionCode?: number;
  versionName?: string;
  iconVersion?: string;
}

/**
 * Checks whether the current website origin is a public HTTPS host reachable by external
 * build workers like Microsoft PWABuilder CloudAPK (rejects localhost / private IPs / plain HTTP).
 */
export function isPublicHttpsOriginForCloudApk(origin: string): boolean {
  try {
    const parsed = new URL(origin);
    if (parsed.protocol !== 'https:') return false;
    const host = parsed.hostname.toLowerCase();
    if (
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host === '0.0.0.0' ||
      host === '::1' ||
      host.endsWith('.local') ||
      host.startsWith('192.168.') ||
      host.startsWith('10.') ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(host)
    ) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Builds the official PWABuilder CloudAPK JSON request payload synced with current
 * store English name, dynamic manifest.json, dynamic icons, and website origin.
 */
export function buildPwaBuilderCloudApkPayload(input: PwaBuilderCloudApkInput) {
  const origin = normalizeWebsiteOrigin(input.websiteOrigin);
  const fullName = resolvePwaEnglishName(input.storeNameEn);
  const launcherName = buildPwaShortName(fullName);
  const packageId = sanitizeAndroidPackageId(input.packageId, fullName);
  const v = encodeURIComponent(String(input.iconVersion || '1'));
  const appVersionCode =
    Number.isFinite(input.versionCode) && (input.versionCode || 0) >= 1
      ? Math.floor(input.versionCode!)
      : 1;
  const appVersion =
    typeof input.versionName === 'string' && /^\d+\.\d+(\.\d+)?$/.test(input.versionName.trim())
      ? input.versionName.trim()
      : '1.0.0';

  return {
    additionalTrustedOrigins: [],
    appVersion,
    appVersionCode,
    backgroundColor: '#0A0F1C',
    display: 'standalone',
    enableNotifications: true,
    enableSiteSettingsShortcut: true,
    fallbackType: 'customtabs',
    features: {
      locationDelegation: { enabled: false },
      playBilling: { enabled: false },
    },
    host: origin,
    iconUrl: `${origin}/api/pwa-icon/512.png?v=${v}`,
    includeSourceCode: false,
    launcherName,
    maskableIconUrl: `${origin}/api/pwa-icon/maskable-512.png?v=${v}`,
    name: fullName,
    navigationColor: '#0A0F1C',
    navigationColorDark: '#0A0F1C',
    navigationDividerColor: '#0A0F1C',
    navigationDividerColorDark: '#0A0F1C',
    orientation: 'portrait-primary',
    packageId,
    pwaUrl: origin,
    signingMode: 'new',
    signing: {
      file: null,
      alias: 'alnour-release-key',
      fullName,
      organization: fullName,
      organizationalUnit: 'Mobile Store',
      countryCode: 'EG',
      keyPassword: 'AlNourStoreKey2026!',
      storePassword: 'AlNourStoreKey2026!',
    },
    splashScreenFadeOutDuration: 300,
    startUrl: '/',
    themeColor: '#0A0F1C',
    themeColorDark: '#0A0F1C',
    webManifestUrl: `${origin}/manifest.json?v=${v}`,
  };
}
