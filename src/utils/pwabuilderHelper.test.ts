import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildPwaBuilderCloudApkPayload,
  isPublicHttpsOriginForCloudApk,
} from './pwabuilderHelper';

test('isPublicHttpsOriginForCloudApk accepts public HTTPS hosts and rejects localhost/HTTP', () => {
  assert.equal(isPublicHttpsOriginForCloudApk('http://127.0.0.1:3000'), false);
  assert.equal(isPublicHttpsOriginForCloudApk('http://localhost:3000'), false);
  assert.equal(isPublicHttpsOriginForCloudApk('https://localhost:3000'), false);
  assert.equal(isPublicHttpsOriginForCloudApk('https://192.168.1.10'), false);
  assert.equal(
    isPublicHttpsOriginForCloudApk(
      'https://ais-pre-t6fp4su7wwjvspwov7dnyh-676768267361.europe-west3.run.app'
    ),
    true
  );
});

test('buildPwaBuilderCloudApkPayload binds dynamic English name, origin, manifest & icons', () => {
  const payload = buildPwaBuilderCloudApkPayload({
    storeNameEn: 'Al-Nour Computer',
    websiteOrigin: 'https://al-nour.example.com',
    packageId: 'com.alnour.computer.store',
    versionCode: 2,
    versionName: '1.1.0',
    iconVersion: '99',
  });
  assert.equal(payload.name, 'Al-Nour Computer');
  assert.equal(payload.launcherName, 'Al-Nour');
  assert.equal(payload.pwaUrl, 'https://al-nour.example.com');
  assert.equal(payload.webManifestUrl, 'https://al-nour.example.com/manifest.json?v=99');
  assert.equal(payload.iconUrl, 'https://al-nour.example.com/api/pwa-icon/512.png?v=99');
  assert.equal(payload.appVersionCode, 2);
});
