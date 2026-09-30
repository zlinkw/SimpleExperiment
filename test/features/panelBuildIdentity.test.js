const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");
const ts = require("typescript");

const sourcePath = path.join(__dirname, "../../src/features/PanelBuildIdentity.ts");
const code = ts.transpileModule(fs.readFileSync(sourcePath, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const loaded = { exports: {} };
vm.runInNewContext(code, { exports: loaded.exports, module: loaded, require });
const { readPanelBuildIdentity, classifyPanelBuildIdentity, stablePanelExtensionProbe } = loaded.exports;

function fakeBuild(files = {}) {
  const contents = new Map(Object.entries({
    "virtual/package.json": JSON.stringify({ version: "0.5.196" }),
    "virtual/dist/extension.js": "extension build A",
    "virtual/dist/ui/PanelHtml.js": "panel build A",
    "virtual/dist/ui/PanelRecoveryHtml.js": "recovery build A",
    ...files,
  }));
  const stats = new Map([...contents.keys()].map((file, index) => [file, { size: Buffer.byteLength(String(contents.get(file))), mtimeMs: index + 1 }]));
  let reads = 0;
  const normalize = file => String(file).replaceAll("\\", "/");
  const fsApi = {
    statSync(file) { const stat = stats.get(normalize(file)); if (!stat) throw new Error("ENOENT"); return stat; },
    readFileSync(file) { const key = normalize(file); if (!contents.has(key)) throw new Error("ENOENT"); reads += 1; return contents.get(key); },
  };
  return { fsApi, contents, stats, readCount: () => reads };
}

test("build identity hashes files once, reuses unchanged stat snapshots, and detects same-version replacement", () => {
  const fixture = fakeBuild();
  const running = readPanelBuildIdentity("virtual", undefined, "0.5.196", fixture.fsApi);
  assert.equal(running.exists, true);
  const reads = fixture.readCount();
  const unchanged = readPanelBuildIdentity("virtual", running, "0.5.196", fixture.fsApi);
  assert.equal(unchanged, running);
  assert.equal(fixture.readCount(), reads);

  fixture.contents.set("virtual/dist/ui/PanelHtml.js", "panel build B");
  fixture.stats.set("virtual/dist/ui/PanelHtml.js", { size: Buffer.byteLength("panel build B"), mtimeMs: 99 });
  const disk = readPanelBuildIdentity("virtual", running, "0.5.196", fixture.fsApi);
  const state = classifyPanelBuildIdentity({ running, disk, installedVersion: "0.5.196", registryAvailable: true });
  assert.equal(state.registryState, "content_mismatch");
  assert.equal(state.reloadRequired, true);
  assert.equal(state.runningVersion, state.installedVersion);
});

test("registry unavailability is unknown until stable probes confirm both registry and disk missing", async () => {
  const fixture = fakeBuild();
  const disk = readPanelBuildIdentity("virtual", undefined, "0.5.196", fixture.fsApi);
  const missingDisk = readPanelBuildIdentity("missing", undefined, "0.5.196", fixture.fsApi);
  let calls = 0;
  let delays = 0;
  const transient = await stablePanelExtensionProbe({
    getExtension: () => (++calls === 1 ? undefined : { version: "0.5.196" }),
    delay: async milliseconds => { assert.equal(milliseconds, 350); delays += 1; },
    readDiskIdentity: () => disk,
  });
  assert.equal(transient.extension.version, "0.5.196");
  assert.equal(transient.missingConfirmed, false);
  assert.equal(delays, 1);
  assert.equal(classifyPanelBuildIdentity({ running: disk, disk, registryAvailable: false, missingConfirmed: false }).registryState, "unknown");

  const confirmedMissing = await stablePanelExtensionProbe({ getExtension: () => undefined, delay: async () => {}, readDiskIdentity: () => missingDisk });
  assert.equal(confirmedMissing.missingConfirmed, true);
  const state = classifyPanelBuildIdentity({ running: disk, disk: missingDisk, registryAvailable: false, missingConfirmed: confirmedMissing.missingConfirmed });
  assert.equal(state.registryState, "extension_missing");
  assert.equal(state.reloadRequired, true);
});

test("build identity distinguishes version mismatch from matching content", () => {
  const fixture = fakeBuild();
  const running = readPanelBuildIdentity("virtual", undefined, "0.5.195", fixture.fsApi);
  assert.equal(classifyPanelBuildIdentity({ running, disk: running, installedVersion: "0.5.196", registryAvailable: true }).registryState, "version_mismatch");
  assert.equal(classifyPanelBuildIdentity({ running, disk: running, installedVersion: "0.5.195", registryAvailable: true }).registryState, "match");
});
