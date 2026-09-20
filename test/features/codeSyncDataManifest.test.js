const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");
const { Readable } = require("node:stream");

const source = fs.readFileSync(path.join(__dirname, "../../dist/extension/legacy.js"), "utf8");
const start = source.indexOf("async function buildLocalCodeManifest(root)");
const end = source.indexOf("function sftpUploadSucceeded(result, fingerprint)", start);
assert.ok(start > 0 && end > start);
test("data package source and nested source are included while data assets are excluded", async () => {
  const root = path.resolve("virtual-code-root");
  const files = [
    "data/auxiliary_views.py",
    "data/multimodal_dataset.py",
    "data/datasets/fixed_protocol_manifest.py",
    "data/datasets/__init__.py",
    "data/protocol_config.yaml",
    "data/patient_info.json",
    "data/sample.npy",
    "data/images/scan.png",
    "data/datasets/image.jpg",
    "data/weights/model.pt",
    "data/patients/subject.py",
  ];
  const dirs = new Set([root]);
  for (const file of files) {
    let dir = path.dirname(path.join(root, file));
    while (dir.startsWith(root) && !dirs.has(dir)) { dirs.add(dir); dir = path.dirname(dir); }
  }
  const virtualFs = {
    async readdir(dir) {
      const children = new Set();
      for (const entry of [...dirs, ...files.map((f) => path.join(root, f))]) {
        if (path.dirname(entry) === dir) children.add(entry);
      }
      return [...children].map((entry) => ({ name: path.basename(entry), isDirectory: () => dirs.has(entry), isFile: () => !dirs.has(entry) }));
    },
    async stat(file) { return { size: Buffer.byteLength(path.relative(root, file)) }; },
  };
  const sandbox = { fs: virtualFs, fsNode: { createReadStream: (file) => Readable.from([Buffer.from(path.relative(root, file))]) }, path, crypto };
  vm.runInNewContext(source.slice(start, end) + "; globalThis.buildLocalCodeManifest = buildLocalCodeManifest;", sandbox);
  const manifest = await sandbox.buildLocalCodeManifest(root);
  for (const file of files.slice(0, 5)) assert.ok(manifest[file], file);
  for (const file of files.slice(5)) assert.equal(manifest[file], undefined, file);
});

test("upload path gates on remote conflicts and verifies required source hashes", () => {
  assert.match(source, /const conflicts = codeSyncConflicts\(rows, manifest\)/);
  assert.match(source, /if \(conflicts\.length\)[\s\S]{0,500}throw new Error/);
  assert.match(source, /const verified = await this\.inspectCodeSyncTarget\(target, requiredSources\)/);
  assert.match(source, /!row\.exists \|\| String\(row\.sha256 \|\| ""\)\.toLowerCase\(\) !== String\(manifest\[row\.path\]\?\.sha256 \|\| ""\)\.toLowerCase\(\)/);
});

test("matching remote source is safe even when Git calls it modified or untracked", () => {
  const sandbox = {};
  vm.runInNewContext(source.slice(source.indexOf("function codeSyncConflicts("), source.indexOf("function fingerprintFromManifest(")) + "; globalThis.check = codeSyncConflicts;", sandbox);
  const manifest = {
    "data/auxiliary_views.py": { sha256: "ABC" },
    "data/multimodal_dataset.py": { sha256: "DEF" },
    "data/datasets/fixed_protocol_manifest.py": { sha256: "123" },
  };
  const rows = [
    { path: "data/auxiliary_views.py", exists: true, status: "??", gitAvailable: true, sha256: "abc" },
    { path: "data/multimodal_dataset.py", exists: true, status: " M", gitAvailable: true, sha256: "different" },
    { path: "data/datasets/fixed_protocol_manifest.py", exists: false, status: "", gitAvailable: true, sha256: "" },
  ];
  const conflicts = sandbox.check(rows, manifest);
  assert.equal(conflicts.length, 1);
  assert.equal(conflicts[0].path, "data/multimodal_dataset.py");
});
