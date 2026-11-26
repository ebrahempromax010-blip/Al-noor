import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildDesktopWebAppLauncherHtml,
  buildDynamicManifestObject,
  buildIosWebClipMobileConfig,
  buildPwaShortName,
  detectInstallPlatform,
  evaluateInstallButtonVisibility,
  formatFileSizeLabel,
  resolveInstallClickAction,
  resolvePwaEnglishName,
  validateUploadedAppBinaryFile,
} from './pwaLogic.ts';

test('resolvePwaEnglishName and buildPwaShortName enforce English mobile icon names', () => {
  assert.equal(resolvePwaEnglishName('Al-Nour Computer'), 'Al-Nour Computer');
  assert.equal(resolvePwaEnglishName(''), 'Al-Nour Computer');
  assert.equal(resolvePwaEnglishName('النور للكمبيوتر'), 'Al-Nour Computer');

  assert.equal(buildPwaShortName('Al-Nour Computer'), 'Al-Nour');
  assert.ok(buildPwaShortName('Al-Nour Pro Workstation Store').length <= 12);
});

test('detectInstallPlatform identifies iPhone, iPad, Android, and desktop accurately', () => {
  assert.equal(
    detectInstallPlatform('Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15'),
    'ios'
  );
  assert.equal(
    detectInstallPlatform('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15', 5),
    'ios'
  );
  assert.equal(
    detectInstallPlatform('Mozilla/5.0 (Linux; Android 14; Pixel 8) Chrome/126.0.0.0 Mobile Safari/537.36'),
    'android'
  );
  assert.equal(
    detectInstallPlatform('Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/126.0.0.0 Safari/537.36'),
    'desktop'
  );
});

test('resolveInstallClickAction triggers instant native prompt whenever available on Android or PC', () => {
  assert.equal(
    resolveInstallClickAction({ platform: 'android', hasNativePrompt: true, isStandalone: false }),
    'trigger_native_prompt'
  );
  assert.equal(
    resolveInstallClickAction({ platform: 'desktop', hasNativePrompt: true, isStandalone: false }),
    'trigger_native_prompt'
  );
  assert.equal(
    resolveInstallClickAction({ platform: 'ios', hasNativePrompt: false, isStandalone: false }),
    'show_ios_guide'
  );
  assert.equal(
    resolveInstallClickAction({ platform: 'android', hasNativePrompt: false, isStandalone: false }),
    'show_android_guide'
  );
  assert.equal(
    resolveInstallClickAction({ platform: 'desktop', hasNativePrompt: false, isStandalone: false }),
    'show_desktop_guide'
  );
  assert.equal(
    resolveInstallClickAction({ platform: 'android', hasNativePrompt: true, isStandalone: true }),
    'already_installed'
  );
});

test('evaluateInstallButtonVisibility hides when installed and restores when uninstalled', () => {
  // Running inside standalone installed app -> hidden on iOS, Android, PC
  const standalone = evaluateInstallButtonVisibility({
    isStandalone: true,
    appInstalledEventFired: false,
    justInstalledInSession: false,
    hasBeforeInstallPrompt: false,
    relatedAppsCount: null,
    wasPreviouslyInstalledFlag: false,
    isIOS: true,
  });
  assert.equal(standalone.isInstalled, true);
  assert.equal(standalone.shouldShowInstallButton, false);

  // Just installed via appinstalled event -> disappears immediately
  const justInstalled = evaluateInstallButtonVisibility({
    isStandalone: false,
    appInstalledEventFired: true,
    justInstalledInSession: true,
    hasBeforeInstallPrompt: false,
    relatedAppsCount: 0,
    wasPreviouslyInstalledFlag: true,
    isIOS: false,
  });
  assert.equal(justInstalled.isInstalled, true);
  assert.equal(justInstalled.shouldShowInstallButton, false);

  // User deleted/uninstalled app on Android/PC -> beforeinstallprompt fires again -> button reappears
  const uninstalledViaPrompt = evaluateInstallButtonVisibility({
    isStandalone: false,
    appInstalledEventFired: false,
    justInstalledInSession: false,
    hasBeforeInstallPrompt: true,
    relatedAppsCount: 0,
    wasPreviouslyInstalledFlag: true,
    isIOS: false,
  });
  assert.equal(uninstalledViaPrompt.isInstalled, false);
  assert.equal(uninstalledViaPrompt.shouldShowInstallButton, true);
  assert.equal(uninstalledViaPrompt.shouldClearInstalledFlag, true);

  // Browser getInstalledRelatedApps reports 0 on return visit -> button reappears
  const uninstalledViaRelatedApps = evaluateInstallButtonVisibility({
    isStandalone: false,
    appInstalledEventFired: false,
    justInstalledInSession: false,
    hasBeforeInstallPrompt: false,
    relatedAppsCount: 0,
    wasPreviouslyInstalledFlag: true,
    isIOS: false,
  });
  assert.equal(uninstalledViaRelatedApps.isInstalled, false);
  assert.equal(uninstalledViaRelatedApps.shouldShowInstallButton, true);
  assert.equal(uninstalledViaRelatedApps.shouldClearInstalledFlag, true);

  // Still installed on Android/PC via getInstalledRelatedApps -> stays hidden
  const stillInstalled = evaluateInstallButtonVisibility({
    isStandalone: false,
    appInstalledEventFired: false,
    justInstalledInSession: false,
    hasBeforeInstallPrompt: false,
    relatedAppsCount: 1,
    wasPreviouslyInstalledFlag: true,
    isIOS: false,
  });
  assert.equal(stillInstalled.isInstalled, true);
  assert.equal(stillInstalled.shouldShowInstallButton, false);

  // iPhone Safari browser tab after user deleted Home Screen icon -> button visible
  const iosSafariTab = evaluateInstallButtonVisibility({
    isStandalone: false,
    appInstalledEventFired: false,
    justInstalledInSession: false,
    hasBeforeInstallPrompt: false,
    relatedAppsCount: null,
    wasPreviouslyInstalledFlag: true,
    isIOS: true,
  });
  assert.equal(iosSafariTab.isInstalled, false);
  assert.equal(iosSafariTab.shouldShowInstallButton, true);
});

test('buildDynamicManifestObject builds English name and versioned PNG icons', () => {
  const manifest = buildDynamicManifestObject({
    storeNameEn: 'Al-Nour Computer',
    taglineEn: 'Computers & Accessories',
    version: 'v42',
    origin: 'https://alnour.example.com',
  });

  assert.equal(manifest.name, 'Al-Nour Computer');
  assert.equal(manifest.short_name, 'Al-Nour');
  assert.equal(manifest.display, 'standalone');
  assert.equal(manifest.related_applications[0].url, 'https://alnour.example.com/manifest.json');
  assert.equal(manifest.icons[0].src, '/api/pwa-icon/192.png?v=v42');
  assert.equal(manifest.icons[1].src, '/api/pwa-icon/512.png?v=v42');
  assert.equal(manifest.icons[2].purpose, 'maskable');
});

test('buildIosWebClipMobileConfig and buildDesktopWebAppLauncherHtml link directly to website', () => {
  const mobileConfig = buildIosWebClipMobileConfig({
    storeNameEn: 'Al-Nour Computer',
    websiteOrigin: 'https://alnour.example.com',
    iconBase64: 'AQIDBA==',
  });
  assert.match(mobileConfig, /<key>FullScreen<\/key>\s*<false\/>/);
  assert.match(mobileConfig, /<string>https:\/\/alnour\.example\.com\/<\/string>/);
  assert.match(mobileConfig, /<data>AQIDBA==<\/data>/);

  const desktopHtml = buildDesktopWebAppLauncherHtml({
    storeNameEn: 'Al-Nour Computer',
    websiteOrigin: 'https://alnour.example.com',
  });
  assert.match(desktopHtml, /https:\/\/alnour\.example\.com\//);
  assert.match(desktopHtml, /Al-Nour Computer/);
});

test('validateUploadedAppBinaryFile and formatFileSizeLabel validate Android APK and iOS IPA uploads', () => {
  const apkOk = validateUploadedAppBinaryFile('android', 'AlNour.apk', 12 * 1024 * 1024);
  assert.equal(apkOk.ok, true);
  if (apkOk.ok) {
    assert.equal(apkOk.ext, '.apk');
    assert.equal(apkOk.cleanName, 'AlNour.apk');
  }

  const ipaOk = validateUploadedAppBinaryFile('ios', 'AlNour.ipa', 8 * 1024 * 1024);
  assert.equal(ipaOk.ok, true);
  if (ipaOk.ok) {
    assert.equal(ipaOk.ext, '.ipa');
  }

  const badAndroid = validateUploadedAppBinaryFile('android', 'AlNour.ipa', 1024);
  assert.equal(badAndroid.ok, false);

  const badEmpty = validateUploadedAppBinaryFile('ios', 'AlNour.ipa', 0);
  assert.equal(badEmpty.ok, false);

  assert.equal(formatFileSizeLabel(5 * 1024 * 1024), '5.0 MB');
  assert.equal(formatFileSizeLabel(4096), '4 KB');
});

