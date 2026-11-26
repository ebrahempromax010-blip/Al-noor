import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildDynamicManifestObject,
  buildPwaShortName,
  evaluateInstallButtonVisibility,
  resolvePwaEnglishName,
} from './pwaLogic.ts';

test('resolvePwaEnglishName and buildPwaShortName enforce English mobile icon names', () => {
  assert.equal(resolvePwaEnglishName('Al-Nour Computer'), 'Al-Nour Computer');
  assert.equal(resolvePwaEnglishName(''), 'Al-Nour Computer');
  assert.equal(resolvePwaEnglishName('النور للكمبيوتر'), 'Al-Nour Computer');

  assert.equal(buildPwaShortName('Al-Nour Computer'), 'Al-Nour');
  assert.ok(buildPwaShortName('Al-Nour Pro Workstation Store').length <= 12);
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
