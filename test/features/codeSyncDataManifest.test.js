const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");
const { Readable } = require("node:stream");

const source = fs.readFileSync(path.join(__dirname, "../../dist/extension/legacy.js"), "utf8");
const start = source.indexOf("async function buildLocalCodeManifest(root");
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

test("upload path does not inspect Git conflicts and verifies transferred source hashes", () => {
  const syncStart = source.indexOf("async syncCodeTargets(");
  const syncEnd = source.indexOf("async inspectCodeSyncTarget(", syncStart);
  const sync = source.slice(syncStart, syncEnd);
  const uploadAt = sync.indexOf('executeCommand("simpleSftp.uploadWorkspace"');
  const verifyAt = sync.indexOf("await this.inspectCodeSyncTarget(target, requiredSources)");
  assert.ok(uploadAt > 0 && verifyAt > uploadAt);
  assert.doesNotMatch(sync.slice(0, uploadAt), /inspectCodeSyncTarget|codeSyncConflicts|远端代码冲突/);
  assert.match(source, /!row\.exists \|\| String\(row\.sha256 \|\| ""\)\.toLowerCase\(\) !== String\(manifest\[row\.path\]\?\.sha256 \|\| ""\)\.toLowerCase\(\)/);
});

test("legacy remote Git conflict gate is absent", () => {
  assert.doesNotMatch(source, /function codeSyncConflicts\(|覆盖列出的远端文件|远端代码冲突|缺少 Git 基线/);
});

test("configured code paths add safe source from excluded directories without data assets", async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "simple-code-includes-"));
  try {
    for (const [name, content] of Object.entries({
      "data/auxiliary_views.py": "ok",
      "datasets/custom_loader.py": "loader",
      "datasets/protocol_config.yaml": "mode: pilot",
      "configs/default.yaml": "mode: train",
      "datasets/raw/patient.npy": "secret",
      "datasets/patients/subject.py": "secret",
      "datasets/model.pt": Buffer.alloc(128 * 1024),
      "work_dirs/secret.py": "secret",
      "simple_cluster/results/plan-1/metrics.json": "{}",
      "simple_cluster/tmp/cluster_scheduler/logs/plan-1.log": "done",
      "simple_cluster/tmp/cluster_scheduler/queue_state.json": "private",
    })) {
      const file = path.join(root, name);
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, content);
    }
    const sandbox = { fs: fs.promises, fsNode: fs, path, crypto };
    vm.runInNewContext(source.slice(start, end) + "; globalThis.buildLocalCodeManifest = buildLocalCodeManifest; globalThis.explicitCodePolicy = explicitCodePolicy;", sandbox);
    const manifest = await sandbox.buildLocalCodeManifest(root, ["datasets", "configs"]);
    for (const file of ["data/auxiliary_views.py", "datasets/custom_loader.py", "datasets/protocol_config.yaml", "datasets/patients/subject.py", "configs/default.yaml"]) assert.ok(manifest[file], file);
    for (const file of ["datasets/raw/patient.npy", "datasets/model.pt", "work_dirs/secret.py"]) assert.equal(manifest[file], undefined, file);
    const customPolicy = sandbox.explicitCodePolicy([".pt"], 10);
    const customManifest = await sandbox.buildLocalCodeManifest(root, ["datasets/model.pt"], customPolicy);
    assert.ok(customManifest["datasets/model.pt"]);
    const resultManifest = await sandbox.buildLocalCodeManifest(root, ["simple_cluster/results"], sandbox.explicitCodePolicy(["*"], 10));
    assert.ok(resultManifest["simple_cluster/results/plan-1/metrics.json"]);
    const logManifest = await sandbox.buildLocalCodeManifest(root, ["simple_cluster/tmp/cluster_scheduler/logs"], sandbox.explicitCodePolicy(["*"], 10));
    assert.ok(logManifest["simple_cluster/tmp/cluster_scheduler/logs/plan-1.log"]);
    await assert.rejects(() => sandbox.buildLocalCodeManifest(root, ["simple_cluster/tmp/cluster_scheduler/queue_state.json"], sandbox.explicitCodePolicy(["*"], 10)), /机器状态/);
    await assert.rejects(() => sandbox.buildLocalCodeManifest(root, ["datasets/model.pt"], sandbox.explicitCodePolicy([".pt"], 0.1)), /超过 0.1 MB/);
    await assert.rejects(() => sandbox.buildLocalCodeManifest(root, ["../outside.py"]), /相对路径/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("code upload path action is available in the panel and saved as plugin configuration", () => {
  const panel = fs.readFileSync(path.join(__dirname, "../../src/ui/PanelHtml.legacy.ts"), "utf8");
  const actionStart = panel.indexOf('<div class="toolbar" data-anchor="sync-check-actions">');
  const actionRow = panel.slice(actionStart, panel.indexOf('<div class="toolbar" data-anchor="sync-actions">', actionStart));
  assert.match(panel, /data-command="configureCodeSyncIncludes"/);
  assert.ok(actionRow.indexOf('data-command="overwriteGithub"') < actionRow.indexOf('data-command="configureCodeSyncIncludes"'));
  assert.ok(actionRow.indexOf('data-command="configureCodeSyncIncludes"') < actionRow.indexOf('data-command="configureDownloadScope"'));
  assert.match(actionRow, /设置上传文件范围/);
  assert.match(actionRow, /设置下载文件范围/);
  assert.match(actionRow, /两套范围独立保存/);
  assert.doesNotMatch(panel, /configureSftpIgnores|设置跳过文件/);
  assert.match(source, /case "configureCodeSyncIncludes"/);
  assert.match(source, /config\.update\("codeSync\.includePaths", updated, vscode\.ConfigurationTarget\.WorkspaceFolder\)/);
  assert.match(source, /buildLocalCodeManifest\(root, includePaths, includePolicy\)/);
});

test("choosing multiple code directories saves all immediately without a second Finish picker", async () => {
  const methodStart = source.indexOf("async configureCodeSyncIncludes() {");
  const methodEnd = source.indexOf("async ensureCodeReadyForRun(", methodStart);
  assert.ok(methodStart > 0 && methodEnd > methodStart);
  const root = path.resolve("virtual-project");
  let pickerCalls = 0;
  let dialogOptions;
  let saved;
  const sandbox = {
    path,
    DEFAULT_EXPLICIT_CODE_EXTENSIONS: [".py"],
    normalizeExplicitCodeExtensions: (value) => Array.isArray(value) && value.length ? value : [".py"],
    normalizeExplicitCodeMaxFileSizeMB: (value) => Number(value) || 2,
    explicitCodePolicy: () => ({ extensions: [".py"], maxFileSizeMB: 2 }),
    normalizedExplicitCodePath: (_root, relative) => ({ relative }),
    collectExplicitCodeFiles: async () => ["data/auxiliary_views.py"],
    vscode: {
      Uri: { file: (fsPath) => ({ fsPath }) },
      ConfigurationTarget: { WorkspaceFolder: 1 },
      workspace: {
        workspaceFolders: [{ uri: { fsPath: root } }],
        getConfiguration: () => ({
          get: (key, fallback) => key === "codeSync.includePaths" ? [] : fallback,
          update: async (_key, value) => { saved = value; },
        }),
      },
      window: {
        showQuickPick: async () => { pickerCalls += 1; return { id: "directory" }; },
        showOpenDialog: async (options) => {
          dialogOptions = options;
          return [{ fsPath: path.join(root, "data") }, { fsPath: path.join(root, "configs") }];
        },
        showInformationMessage: async () => undefined,
      },
    },
  };
  vm.runInNewContext(`class Action { ${source.slice(methodStart, methodEnd)} }; globalThis.Action = Action;`, sandbox);
  await new sandbox.Action().configureCodeSyncIncludes();
  assert.equal(pickerCalls, 1);
  assert.equal(dialogOptions.canSelectFolders, true);
  assert.equal(dialogOptions.canSelectMany, true);
  assert.deepEqual(Array.from(saved), ["configs", "data"]);
});

test("rejected code directory reports why it was not added", async () => {
  const methodStart = source.indexOf("async configureCodeSyncIncludes() {");
  const methodEnd = source.indexOf("async ensureCodeReadyForRun(", methodStart);
  const root = path.resolve("virtual-project");
  const notices = [];
  let saved = false;
  const sandbox = {
    path,
    errorMessage: (error) => error.message,
    DEFAULT_EXPLICIT_CODE_EXTENSIONS: [".py"],
    normalizeExplicitCodeExtensions: (value) => Array.isArray(value) && value.length ? value : [".py"],
    normalizeExplicitCodeMaxFileSizeMB: (value) => Number(value) || 2,
    explicitCodePolicy: () => ({ extensions: [".py"], maxFileSizeMB: 2 }),
    normalizedExplicitCodePath: (_root, relative) => ({ relative }),
    collectExplicitCodeFiles: async () => { throw new Error("代码上传路径没有可上传文件：artifacts"); },
    vscode: {
      ConfigurationTarget: { WorkspaceFolder: 1 },
      workspace: {
        workspaceFolders: [{ uri: { fsPath: root } }],
        getConfiguration: () => ({ get: (key, fallback) => key === "codeSync.includePaths" ? [] : fallback, update: async () => { saved = true; } }),
      },
      window: {
        showQuickPick: async () => ({ id: "directory" }),
        showOpenDialog: async () => [{ fsPath: path.join(root, "artifacts") }],
        showErrorMessage: async (message) => { notices.push(message); },
      },
    },
  };
  vm.runInNewContext(`class Action { ${source.slice(methodStart, methodEnd)} }; globalThis.Action = Action;`, sandbox);
  await assert.rejects(() => new sandbox.Action().configureCodeSyncIncludes(), /没有可上传文件/);
  assert.equal(saved, false);
  assert.match(notices[0], /未添加 artifacts.*没有可上传文件.*未更改/);
});
