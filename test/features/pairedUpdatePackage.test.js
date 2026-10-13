const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { crc32, inspectVsix, verifyVsix, PackageStore } = require('../../dist/updates/VerifiedPackage');
function zip(entries) {
  const local = [], central = []; let offset = 0;
  for (const [name, text] of entries) {
    const filename = Buffer.from(name), body = Buffer.from(text), head = Buffer.alloc(30), dir = Buffer.alloc(46);
    head.writeUInt32LE(0x04034b50); head.writeUInt32LE(crc32(body), 14); head.writeUInt32LE(body.length, 18); head.writeUInt32LE(body.length, 22); head.writeUInt16LE(filename.length, 26);
    dir.writeUInt32LE(0x02014b50); dir.writeUInt32LE(crc32(body), 16); dir.writeUInt32LE(body.length, 20); dir.writeUInt32LE(body.length, 24); dir.writeUInt16LE(filename.length, 28); dir.writeUInt32LE(offset, 42);
    local.push(head, filename, body); central.push(dir, filename); offset += head.length + filename.length + body.length;
  }
  const directory = Buffer.concat(central), end = Buffer.alloc(22); end.writeUInt32LE(0x06054b50); end.writeUInt16LE(central.length / 2, 8); end.writeUInt16LE(central.length / 2, 10); end.writeUInt32LE(directory.length, 12); end.writeUInt32LE(offset, 16);
  return Buffer.concat([...local, directory, end]);
}
function fixture(platform = '', name = 'simple-experiment') {
  return zip([['extension/package.json', JSON.stringify({ publisher: 'simple-local', name, version: '1.1.0', engines: { vscode: '^1.100.0' } })],
    ['extension.vsixmanifest', `<Identity Publisher="simple-local" Id="${name}" Version="1.1.0"${platform ? ` TargetPlatform="${platform}"` : ''}/>`], ['extension/main.js', 'module.exports = {};']]);
}
function component(bytes) { return { id: 'simple-local.simple-experiment', repo: 'zlinkw/SimpleExperiment', latestVersion: '1.1.0', vsix: { url: 'https://github.com/zlinkw/SimpleExperiment/releases/download/v1.1.0/simple-experiment-1.1.0.vsix', size: bytes.length, targetPlatform: 'universal', digest: 'sha256:' + createHash('sha256').update(bytes).digest('hex') } }; }
test('validates actual XML, package, engine, runtime CRC and Windows platform instead of filename alone', () => {
  const good = fixture(); assert.equal(verifyVsix(good, component(good), '1.100.0').targetPlatform, 'universal');
  assert.throws(() => verifyVsix(good, component(good), '1.99.0'), /不兼容/);
  for (const bytes of [fixture('darwin-arm64'), fixture('', 'simple-experiment-mac')]) assert.throws(() => verifyVsix(bytes, component(bytes), '1.100.0'), /身份/);
  const bad = Buffer.from(good); bad[good.indexOf('module.exports')] ^= 1; assert.throws(() => inspectVsix(bad), /CRC/);
  assert.throws(() => inspectVsix(zip([['../escape', 'bad']])), /路径/);
  assert.throws(() => inspectVsix(zip([['x', '1'], ['X', '2']])), /重复/);
});
test('prepared file is hash-addressed, reused without overwrite, and reverified just before installation', async () => {
  const root = fs.mkdtempSync(path.join(require('node:os').tmpdir(), 'paired-update-package-')), bytes = fixture(); let calls = 0;
  const store = new PackageStore(root, { request: async () => { calls++; return bytes; } }, '1.100.0');
  const c = component(bytes), file = await store.prepare(c); assert.equal(await store.prepare(c), file); assert.equal(calls, 1);
  fs.writeFileSync(file, 'tampered', 'utf8'); await assert.rejects(store.verify(file, c), /SHA/); await assert.rejects(store.prepare(c), /SHA/);
});
