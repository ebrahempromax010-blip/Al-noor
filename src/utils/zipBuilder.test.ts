import test from 'node:test';
import assert from 'node:assert/strict';
import zlib from 'node:zlib';
import { buildZipArchive, crc32, extractEntryFromZip } from './zipBuilder';

test('crc32 matches known IEEE 802.3 checksum', () => {
  const checksum = crc32(Buffer.from('123456789', 'ascii'));
  assert.equal(checksum, 0xcbf43926);
});

test('buildZipArchive emits valid PKZIP signatures and EOCD record count', () => {
  const archive = buildZipArchive([
    { name: 'hello/world.txt', content: 'Al-Nour Computer' },
    { name: 'bin/icon.png', content: Buffer.from([0x89, 0x50, 0x4e, 0x47]) },
  ]);
  assert.equal(archive.subarray(0, 4).toString('binary'), 'PK\x03\x04');
  const eocdOffset = archive.length - 22;
  assert.equal(archive.subarray(eocdOffset, eocdOffset + 4).toString('binary'), 'PK\x05\x06');
  assert.equal(archive.readUInt16LE(eocdOffset + 10), 2);
});

test('extractEntryFromZip extracts STORE and DEFLATE entries cleanly', () => {
  const archive = buildZipArchive([
    { name: 'readme.txt', content: 'Hello Store' },
    { name: 'app-release-signed.apk', content: Buffer.from([0x50, 0x4b, 0x03, 0x04, 0xaa, 0xbb]) },
  ]);
  const apk = extractEntryFromZip(archive, (name) => name.endsWith('.apk'));
  assert.ok(apk);
  assert.equal(apk.name, 'app-release-signed.apk');
  assert.deepEqual(apk.data, Buffer.from([0x50, 0x4b, 0x03, 0x04, 0xaa, 0xbb]));

  // Also test DEFLATE (method 8) extraction
  const raw = Buffer.from('Al-Nour Play Store Bundle AAB Content', 'utf8');
  const compressed = zlib.deflateRawSync(raw);
  const nameBuf = Buffer.from('app-release.aab', 'utf8');

  const local = Buffer.alloc(30);
  local.writeUInt32LE(0x04034b50, 0);
  local.writeUInt16LE(20, 4);
  local.writeUInt16LE(8, 8);
  local.writeUInt32LE(crc32(raw), 14);
  local.writeUInt32LE(compressed.length, 18);
  local.writeUInt32LE(raw.length, 22);
  local.writeUInt16LE(nameBuf.length, 26);

  const central = Buffer.alloc(46);
  central.writeUInt32LE(0x02014b50, 0);
  central.writeUInt16LE(20, 4);
  central.writeUInt16LE(20, 6);
  central.writeUInt16LE(8, 10);
  central.writeUInt32LE(crc32(raw), 16);
  central.writeUInt32LE(compressed.length, 20);
  central.writeUInt32LE(raw.length, 24);
  central.writeUInt16LE(nameBuf.length, 28);
  central.writeUInt32LE(0, 42);

  const cdOffset = local.length + nameBuf.length + compressed.length;
  const cdSize = central.length + nameBuf.length;
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(1, 8);
  eocd.writeUInt16LE(1, 10);
  eocd.writeUInt32LE(cdSize, 12);
  eocd.writeUInt32LE(cdOffset, 16);

  const deflatedZip = Buffer.concat([local, nameBuf, compressed, central, nameBuf, eocd]);
  const aab = extractEntryFromZip(deflatedZip, (n) => n.endsWith('.aab'));
  assert.ok(aab);
  assert.equal(aab.data.toString('utf8'), 'Al-Nour Play Store Bundle AAB Content');
});
