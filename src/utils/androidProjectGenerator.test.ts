import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildAndroidProjectFiles,
  buildAssetLinksJson,
  PLAY_STORE_TARGET_SDK,
  sanitizeAndroidPackageId,
} from './androidProjectGenerator';

test('sanitizeAndroidPackageId validates or derives Play-Store package name cleanly', () => {
  assert.equal(sanitizeAndroidPackageId('com.alnour.computer.app'), 'com.alnour.computer.app');
  assert.equal(sanitizeAndroidPackageId('invalid pkg', 'Al-Nour Computer'), 'com.alnourcomputer.store');
  assert.equal(sanitizeAndroidPackageId('', ''), 'com.alnourcomputer.store');
});

test('buildAndroidProjectFiles embeds live English name, Target SDK 35, website link & Firestore path', () => {
  const files = buildAndroidProjectFiles({
    storeNameEn: 'Al-Nour Computer',
    websiteOrigin: 'https://al-nour-computer.web.app',
    packageId: 'com.alnour.computer.store',
    versionCode: 3,
    versionName: '1.2.0',
    iconPng512: Buffer.from([0x89, 0x50, 0x4e, 0x47]),
  });

  const byName = new Map(files.map((f) => [f.name, f.content.toString('utf8')]));
  const gradle = byName.get('app/build.gradle.kts') || '';
  const strings = byName.get('app/src/main/res/values/strings.xml') || '';
  const manifest = byName.get('app/src/main/AndroidManifest.xml') || '';
  const activity = byName.get('app/src/main/java/com/alnour/computer/store/MainActivity.kt') || '';

  assert.match(gradle, new RegExp(`targetSdk = ${PLAY_STORE_TARGET_SDK}`));
  assert.match(gradle, /versionCode = 3/);
  assert.match(gradle, /bundle \{/);
  assert.match(gradle, /computer_tech_store\/main_data/);
  assert.match(strings, /<string name="app_name">Al-Nour Computer<\/string>/);
  assert.match(manifest, /android:autoVerify="true"/);
  assert.match(activity, /TrustedWebActivityIntentBuilder/);
  assert.equal(byName.has('app/src/main/res/mipmap-xxxhdpi/ic_launcher.png'), true);
});

test('buildAssetLinksJson includes SHA-256 fingerprint when valid', () => {
  const fp =
    'AA:BB:CC:DD:EE:FF:00:11:22:33:44:55:66:77:88:99:AA:BB:CC:DD:EE:FF:00:11:22:33:44:55:66:77:88:99';
  const links = buildAssetLinksJson('com.alnour.computer.store', [fp]);
  const target = links[0].target as { sha256_cert_fingerprints: string[] };
  assert.equal(target.sha256_cert_fingerprints[0], fp);
});
