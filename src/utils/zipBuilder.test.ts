import test from 'node:test';
import assert from 'node:assert/strict';
import { buildZipArchive, crc32 } from './zipBuilder';

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
